import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'
import { useCoupon, isCouponValid } from '@/lib/coupons'

/**
 * 트랜잭션 함수가 없을 때 사용하는 폴백 함수
 */
async function createOrderWithoutTransaction(
  supabase: any,
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
  items: any[],
  usedCouponId: string | null,
  usedPoints: number
) {
  // 기존 방식 (트랜잭션 없음)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_amount: finalAmount,
      status: process.env.NODE_ENV === 'development' ? 'delivered' : 'paid',
      delivery_type: deliveryType,
      delivery_time: deliveryTime,
      shipping_address: shippingAddress,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      delivery_note: deliveryNote,
    })
    .select()
    .single()

  if (orderError) {
    throw new Error(orderError.message)
  }

  // 주문 아이템 저장
  if (order && items && items.length > 0) {
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
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
      used_points = 0  // 사용한 포인트
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

    // 트랜잭션으로 주문 생성 (모든 작업을 원자적으로 처리)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('create_order_with_transaction', {
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
      })

      if (rpcError) {
        // RPC 함수가 없으면 기존 방식으로 폴백
        if (rpcError.code === '42883') {
          console.warn('트랜잭션 함수가 없습니다. 기존 방식으로 처리합니다.')
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
            used_points
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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('주문 조회 실패:', orderError)
        return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ order })
    } catch (error: any) {
      console.error('주문 생성 트랜잭션 실패:', error)
      return NextResponse.json({ error: error.message || '주문 생성에 실패했습니다.' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('주문 생성 에러:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

