import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'
import { useCoupon, isCouponValid } from '@/lib/coupons'
import { normalizeOrderItems } from '@/lib/order-utils'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 트랜잭션 함수가 없을 때 사용하는 폴백 함수
 */
async function createOrderWithoutTransaction(
  supabase: SupabaseClient,
  userId: string,
  totalAmount: number,
  finalAmount: number,
  couponDiscount: number,
  deliveryType: string,
  deliveryTime: string | null,
  shippingAddress: string,
  shippingName: string,
  shippingPhone: string,
  deliveryNote: string | null,
  items: Array<{ productId: string | number; quantity: number; price: number; [key: string]: unknown }>,
  usedCouponId: string | null,
  usedPoints: number,
      // 선물 관련 파라미터 추가
      isGift: boolean = false,
      giftMessage: string | null = null,
      giftCardDesign: string | null = null
) {
  // 기존 방식 (트랜잭션 없음)
  const orderData: Record<string, unknown> = {
    user_id: userId,
    total_amount: finalAmount,
    status: 'paid',
    delivery_type: deliveryType,
    delivery_time: deliveryTime,
    shipping_address: shippingAddress,
    shipping_name: shippingName,
    shipping_phone: shippingPhone,
    delivery_note: deliveryNote,
  }
  
  // 선물 정보 추가
  if (isGift) {
    // 개별 컬럼으로 저장 시도
    orderData.is_gift = true
    orderData.gift_message = giftMessage
    orderData.gift_card_design = giftCardDesign
    // 만료일 설정 (7일 후)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    orderData.gift_expires_at = expiresAt.toISOString()
  }
  
  let order: { id: string; [key: string]: unknown } | null = null
  const { data: orderDataResult, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  // 컬럼이 없어서 에러가 발생하면 JSON 필드로 재시도
  if (orderError && isGift && (orderError.code === '42703' || orderError.message?.includes('column'))) {
    // 컬럼이 없는 경우 JSON 필드에 저장
    const orderDataWithoutGiftColumns = {
      user_id: userId,
      total_amount: finalAmount,
      status: 'paid',
      delivery_type: deliveryType,
      delivery_time: deliveryTime,
      shipping_address: shippingAddress,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      delivery_note: deliveryNote,
      gift_info: JSON.stringify({
        message: giftMessage,
        card_design: giftCardDesign,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후
      })
    }
    
    const { data: retryOrder, error: retryError } = await supabase
      .from('orders')
      .insert(orderDataWithoutGiftColumns)
      .select()
      .single()
    
    if (retryError) {
      throw new Error(retryError.message)
    }
    
    order = retryOrder
  } else if (orderError) {
    throw new Error(orderError.message)
  } else {
    order = orderDataResult
  }

  // 주문 아이템 저장
  if (order && items && items.length > 0) {
    const orderItems = items.map((item) => ({
      order_id: order!.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('주문 아이템 저장 실패:', itemsError)
      // 주문은 생성되었지만 아이템 저장 실패 - 부분 실패
    }
  }

  // 쿠폰 사용 처리
  if (usedCouponId && order && couponDiscount > 0) {
    await useCoupon(userId, usedCouponId, order.id, totalAmount)
  }

  // 포인트 사용 처리
  if (usedPoints > 0 && order) {
    const { usePoints } = await import('@/lib/points')
    await usePoints(userId, usedPoints, order.id, `주문 #${order.id} 포인트 사용`)
  }

  // 포인트 적립은 구매확정 시 처리 (배송완료 후 구매확정 버튼 클릭 시)

  // 선물 주문인 경우 토큰 생성 및 저장
  if (isGift && order) {
    console.log('폴백 함수: 선물 주문 토큰 생성 시작:', { orderId: order.id, isGift, giftMessage, giftCardDesign })
    const giftToken = crypto.randomBytes(32).toString('hex')
    console.log('폴백 함수: 생성된 토큰:', giftToken)
    
    // gift_token 컬럼이 있으면 사용, 없으면 gift_info JSON에 포함
    try {
      const updateData: Record<string, unknown> = {
        gift_token: giftToken,
        is_gift: true,
        gift_message: giftMessage || null,
        gift_card_design: giftCardDesign || null,
      }
      
      // 만료일 설정 (7일 후)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      updateData.gift_expires_at = expiresAt.toISOString()
      
      console.log('폴백 함수: 선물 정보 업데이트 시도:', { orderId: order.id, updateData })
      const { error: tokenError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
      
      console.log('폴백 함수: 선물 정보 업데이트 결과:', { tokenError: tokenError?.message, code: tokenError?.code })
      
      if (tokenError && (tokenError.code === '42703' || tokenError.message?.includes('column'))) {
        // gift_token 컬럼이 없으면 gift_info JSON에 추가
        const currentGiftInfo = (order.gift_info && typeof order.gift_info === 'string') 
          ? JSON.parse(order.gift_info) 
          : {}
        const updatedGiftInfo = {
          ...currentGiftInfo,
          token: giftToken,
          message: giftMessage,
          card_design: giftCardDesign,
          expires_at: expiresAt.toISOString()
        }
        
        await supabase
          .from('orders')
          .update({ 
            gift_info: JSON.stringify(updatedGiftInfo),
            is_gift: true
          })
          .eq('id', order.id)
      } else if (tokenError) {
        console.error('폴백 함수: 선물 정보 업데이트 실패:', tokenError)
      } else {
        console.log('폴백 함수: 선물 정보 업데이트 성공:', { orderId: order.id, giftToken })
      }
      
      // 업데이트 후 주문 정보 다시 조회
      const { data: updatedOrder, error: refreshError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single()
      
      console.log('폴백 함수: 업데이트 후 주문 재조회 결과:', { 
        found: !!updatedOrder, 
        error: refreshError?.message,
        gift_token: updatedOrder?.gift_token,
        is_gift: updatedOrder?.is_gift
      })
      
      if (!refreshError && updatedOrder) {
        order = updatedOrder
        console.log('폴백 함수: 최종 주문 정보:', { 
          id: updatedOrder.id, 
          gift_token: updatedOrder.gift_token, 
          is_gift: updatedOrder.is_gift 
        })
      } else if (order) {
        // 조회 실패해도 응답에는 토큰 포함
        order.gift_token = giftToken
        order.is_gift = true
        order.gift_message = giftMessage
        order.gift_card_design = giftCardDesign
      }
    } catch (error) {
      console.error('폴백 함수: 선물 토큰 저장 실패:', error)
      // 토큰 저장 실패해도 주문은 성공으로 처리
      if (order) {
        order.gift_token = giftToken
        order.is_gift = true
        order.gift_message = giftMessage
        order.gift_card_design = giftCardDesign
      }
    }
  }

  return NextResponse.json({ order })
}

// POST: 주문 생성
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const body = await request.json()
    const { 
      total_amount, 
      delivery_type, 
      delivery_time,
      shipping_address, 
      shipping_name, 
      shipping_phone,
      delivery_note,
      items,
      used_coupon_id,  // 사용한 쿠폰 ID (user_coupons 테이블의 id)
      used_points = 0,  // 사용한 포인트
      // 선물 관련 필드
      is_gift = false,
      gift_message = null,
      gift_card_design = null
    } = body

    // 쿠폰 할인 금액 계산 (주문 생성 전)
    let couponDiscount = 0
    if (used_coupon_id) {
      // 쿠폰 정보 조회하여 할인 금액 계산
      const { data: userCoupon } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:coupons (*)
        `)
        .eq('id', used_coupon_id)
        .eq('user_id', user.id)
        .eq('is_used', false)
        .single()

      if (userCoupon && userCoupon.coupon) {
        const coupon = userCoupon.coupon as any
        
        // 유효기간 및 최소 구매 금액 체크
        if (isCouponValid(userCoupon, coupon) &&
            (!coupon.min_purchase_amount || total_amount >= coupon.min_purchase_amount)) {
          
          if (coupon.discount_type === 'percentage') {
            couponDiscount = Math.floor(total_amount * (coupon.discount_value / 100))
            if (coupon.max_discount_amount) {
              couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount)
            }
          } else {
            couponDiscount = coupon.discount_value
          }
        }
      }
    }

    let finalAmount = total_amount - couponDiscount

    // 포인트 사용 처리
    if (used_points > 0) {
      finalAmount = Math.max(0, finalAmount - used_points)
    }

    // 중복 주문 방지: 최근 동일 주문 탐지 (10분 이내 동일한 주문 내용을 다시 전송한 경우)
    // 클라이언트/네트워크 재전송, 새로고침으로 인한 다중 POST를 서버에서 가드
    const itemsFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalizeOrderItems(items || [])))
      .digest('hex')

    const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    // 후보 주문 조회 (같은 사용자, 같은 배송/수령 정보, 최근 10분)
    const { data: candidateOrders, error: candidateError } = await supabase
      .from('orders')
      .select('id, delivery_type, delivery_time, shipping_address, shipping_name, shipping_phone, delivery_note, created_at, total_amount')
      .eq('user_id', user.id)
      .gte('created_at', sinceIso)
      .eq('delivery_type', delivery_type)
      .eq('delivery_time', delivery_time || null)
      .eq('shipping_address', shipping_address)
      .eq('shipping_name', shipping_name)
      .eq('shipping_phone', shipping_phone)
      .eq('delivery_note', delivery_note || null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!candidateError && candidateOrders && candidateOrders.length > 0) {
      // 각 후보에 대해 order_items를 조회하여 아이템 구성이 동일한지 확인
      for (const cand of candidateOrders) {
        const { data: candItems, error: candItemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity, price')
          .eq('order_id', cand.id)

        if (candItemsError) continue
        const candNormalized = normalizeOrderItems(
          (candItems || []).map(i => ({
            productId: i.product_id,
            quantity: i.quantity,
            price: i.price,
          }))
        )
        const candFingerprint = crypto
          .createHash('sha256')
          .update(JSON.stringify(candNormalized))
          .digest('hex')

        // 금액까지 동일하면 사실상 동일 주문으로 간주
        if (candFingerprint === itemsFingerprint && Number(cand.total_amount) === Number(finalAmount)) {
          return NextResponse.json({ order: cand })
        }
      }
    }

    // 트랜잭션으로 주문 생성 (모든 작업을 원자적으로 처리)
    try {
      // RPC 함수에 선물 파라미터가 없을 수 있으므로, 먼저 기본 파라미터만으로 시도
      const rpcParams: Record<string, unknown> = {
        p_user_id: user.id,
        p_total_amount: total_amount,
        p_delivery_type: delivery_type,
        p_delivery_time: delivery_time || null,
        p_shipping_address: shipping_address,
        p_shipping_name: shipping_name,
        p_shipping_phone: shipping_phone,
        p_delivery_note: delivery_note || null,
        p_order_items: items || [],
        p_used_coupon_id: used_coupon_id || null,
        p_used_points: used_points || 0,
        p_coupon_discount: couponDiscount,
      }

      // 선물 파라미터 추가 (RPC 함수가 지원하는 경우)
      if (is_gift) {
        rpcParams.p_is_gift = true
        rpcParams.p_gift_message = gift_message || null
        rpcParams.p_gift_card_design = gift_card_design || null
      }

      const { data: result, error: rpcError } = await supabase.rpc('create_order_with_transaction', rpcParams)

      if (rpcError) {
        console.error('RPC 함수 호출 에러:', rpcError)
        
        // RPC 함수가 없거나 파라미터가 맞지 않으면 기존 방식으로 폴백
        if (rpcError.code === '42883' || rpcError.code === '42804' || rpcError.message?.includes('function') || rpcError.message?.includes('parameter')) {
          console.warn('트랜잭션 함수가 없거나 파라미터가 맞지 않습니다. 기존 방식으로 처리합니다.')
          return await createOrderWithoutTransaction(
            supabase,
            user.id,
            total_amount,
            finalAmount,
            couponDiscount,
            delivery_type,
            delivery_time,
            shipping_address,
            shipping_name,
            shipping_phone,
            delivery_note,
            items,
            used_coupon_id,
            used_points,
            is_gift,
            gift_message,
            gift_card_design
          )
        }
        throw rpcError
      }

      if (!result || result.length === 0 || !result[0].success) {
        const errorMsg = result?.[0]?.error_message || '주문 생성에 실패했습니다.'
        return NextResponse.json({ error: errorMsg }, { status: 500 })
      }

      const orderId = result[0].order_id

      // 주문 정보 조회
      let { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('주문 조회 실패:', orderError)
        return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
      }

      if (!order) {
        return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
      }

      // 선물 주문인 경우 토큰 생성 및 저장
      // RPC 함수에서 이미 저장되었을 수도 있지만, 확실하게 저장하기 위해 다시 업데이트
      if (is_gift && order) {
        console.log('선물 주문 토큰 생성 시작:', { orderId, is_gift, gift_message, gift_card_design })
        const giftToken = crypto.randomBytes(32).toString('hex')
        console.log('생성된 토큰:', giftToken)
        
        try {
          // is_gift, gift_message, gift_card_design도 함께 업데이트 (RPC에서 저장되지 않았을 경우 대비)
          const updateData: Record<string, unknown> = {
            gift_token: giftToken,
            is_gift: true,
            gift_message: gift_message || null,
            gift_card_design: gift_card_design || null,
          }
          
          // 만료일 설정 (7일 후)
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)
          updateData.gift_expires_at = expiresAt.toISOString()
          
          console.log('선물 정보 업데이트 시도:', { orderId, updateData })
          const { error: tokenError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
          
          console.log('선물 정보 업데이트 결과:', { tokenError: tokenError?.message, code: tokenError?.code })
          
          if (tokenError && (tokenError.code === '42703' || tokenError.message?.includes('column'))) {
            // gift_token 컬럼이 없으면 gift_info JSON에 추가
            const currentGiftInfo = (order.gift_info && typeof order.gift_info === 'string') 
              ? JSON.parse(order.gift_info) 
              : {}
            const updatedGiftInfo = {
              ...currentGiftInfo,
              token: giftToken,
              message: gift_message,
              card_design: gift_card_design,
              expires_at: expiresAt.toISOString()
            }
            
            await supabase
              .from('orders')
              .update({ 
                gift_info: JSON.stringify(updatedGiftInfo),
                is_gift: true
              })
              .eq('id', orderId)
          } else if (tokenError) {
            console.error('선물 정보 업데이트 실패:', tokenError)
          } else {
            console.log('선물 정보 업데이트 성공:', { orderId, giftToken })
          }
          
          // 업데이트 후 주문 정보 다시 조회 (확실하게 저장된 값 가져오기)
          const { data: updatedOrder, error: refreshError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()
          
          console.log('업데이트 후 주문 재조회 결과:', { 
            found: !!updatedOrder, 
            error: refreshError?.message,
            gift_token: updatedOrder?.gift_token,
            is_gift: updatedOrder?.is_gift
          })
          
          if (!refreshError && updatedOrder) {
            order = updatedOrder
            console.log('최종 주문 정보:', { 
              id: order.id, 
              gift_token: order.gift_token, 
              is_gift: order.is_gift 
            })
          } else {
            // 조회 실패해도 응답에는 토큰 포함
            order.gift_token = giftToken
            order.is_gift = true
            order.gift_message = gift_message
            order.gift_card_design = gift_card_design
          }
        } catch (error) {
          console.error('선물 정보 저장 실패:', error)
          // 저장 실패해도 주문은 성공으로 처리, 토큰은 새로 생성한 것으로 사용
          order.gift_token = giftToken
          order.is_gift = true
          order.gift_message = gift_message
          order.gift_card_design = gift_card_design
        }
      }

      return NextResponse.json({ order })
    } catch (error) {
      console.error('주문 생성 트랜잭션 실패:', error)
      const message = error instanceof Error ? error.message : '주문 생성에 실패했습니다.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('주문 생성 에러:', error)
    const message = error instanceof Error ? error.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

