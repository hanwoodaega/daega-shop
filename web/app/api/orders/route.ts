import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
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

  if (orderError) {
    throw new Error(orderError.message)
  }
  
  order = orderDataResult

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
    const giftToken = crypto.randomBytes(32).toString('hex')
    
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      
      const { error: tokenError } = await supabase
        .from('orders')
        .update({
          gift_token: giftToken,
          is_gift: true,
          gift_message: giftMessage || null,
          gift_card_design: giftCardDesign || null,
          gift_expires_at: expiresAt.toISOString(),
        })
        .eq('id', order.id)
      
      if (tokenError) {
        throw tokenError
      }
      
      // 업데이트 후 주문 정보 다시 조회
      const { data: updatedOrder, error: refreshError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single()
      
      if (!refreshError && updatedOrder) {
        order = updatedOrder
      } else if (order) {
        // 조회 실패해도 응답에는 토큰 포함
        order.gift_token = giftToken
        order.is_gift = true
        order.gift_message = giftMessage
        order.gift_card_design = giftCardDesign
      }
    } catch (error) {
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
      // N+1 쿼리 방지: 모든 후보 주문의 order_items를 한 번에 조회
      const candidateOrderIds = candidateOrders.map(cand => cand.id)
      const { data: allCandidateItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, price')
        .in('order_id', candidateOrderIds)

      if (!itemsError && allCandidateItems) {
        // order_id별로 그룹화
        const itemsByOrderId = new Map<string, Array<{ product_id: string | number; quantity: number; price: number }>>()
        for (const item of allCandidateItems) {
          const orderId = item.order_id
          if (!itemsByOrderId.has(orderId)) {
            itemsByOrderId.set(orderId, [])
          }
          itemsByOrderId.get(orderId)!.push({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })
        }

        // 각 후보 주문의 아이템 구성 확인
        for (const cand of candidateOrders) {
          const candItems = itemsByOrderId.get(cand.id) || []
          const candNormalized = normalizeOrderItems(
            candItems.map(i => ({
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
        // RPC 함수가 없거나 파라미터가 맞지 않으면 기존 방식으로 폴백
        if (rpcError.code === '42883' || rpcError.code === '42804' || rpcError.message?.includes('function') || rpcError.message?.includes('parameter')) {
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
        return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
      }

      if (!order) {
        return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
      }

      // 선물 주문인 경우 토큰 생성 및 저장
      if (is_gift && order) {
        const giftToken = crypto.randomBytes(32).toString('hex')
        
        try {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)
          
          const { error: tokenError } = await supabase
            .from('orders')
            .update({
              gift_token: giftToken,
              is_gift: true,
              gift_message: gift_message || null,
              gift_card_design: gift_card_design || null,
              gift_expires_at: expiresAt.toISOString(),
            })
            .eq('id', orderId)
          
          if (tokenError) {
            throw tokenError
          }
          
          // 업데이트 후 주문 정보 다시 조회
          const { data: updatedOrder, error: refreshError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()
          
          if (!refreshError && updatedOrder) {
            order = updatedOrder
          } else {
            // 조회 실패해도 응답에는 토큰 포함
            order.gift_token = giftToken
            order.is_gift = true
            order.gift_message = gift_message
            order.gift_card_design = gift_card_design
          }
        } catch (error) {
          // 저장 실패해도 주문은 성공으로 처리
          order.gift_token = giftToken
          order.is_gift = true
          order.gift_message = gift_message
          order.gift_card_design = gift_card_design
        }
      }

      return NextResponse.json({ order })
    } catch (error) {
      const message = error instanceof Error ? error.message : '주문 생성에 실패했습니다.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

