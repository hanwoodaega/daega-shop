import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { VALID_ORDER_STATUSES } from '@/lib/constants'

// 관리자 인증 확인 (쿠키 기반)
async function verifyAdmin() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  return adminAuth?.value === '1'
}

// GET: 주문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const deliveryType = searchParams.get('delivery_type')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const supabase = createSupabaseAdminClient()
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          product:products (
            id,
            name,
            image_url,
            price,
            discount_percent
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    // 필터 적용
    if (deliveryType) {
      query = query.eq('delivery_type', deliveryType)
    }
    
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString())
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('주문 조회 실패:', error)
      return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
    }

    // 각 주문에 대해 쿠폰 할인, 포인트 사용, 즉시할인 정보 추가
    const ordersWithDetails = await Promise.all(
      (orders || []).map(async (order: any) => {
        // 상품 원가 합계 계산
        // 주문 생성 시 order_items.price에 저장되는 것은 원가입니다
        // 할인된 가격은 별도로 계산해야 합니다
        let productOriginalTotal = 0
        let productOrderedTotal = 0
        
        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach((item: any) => {
            // order_items.price는 주문 생성 시점의 원가입니다
            const originalPrice = item.price || 0
            
            // products 테이블의 현재 원가 (변경되었을 수 있음)
            const currentProductPrice = item.product?.price || 0
            
            // 원가: order_items.price 사용 (주문 시점의 원가)
            productOriginalTotal += originalPrice * item.quantity
            
            // 할인된 가격 계산
            // discount_percent가 있으면 할인된 가격, 없으면 원가
            const discountPercent = item.product?.discount_percent || 0
            const discountedPrice = discountPercent > 0
              ? Math.round(originalPrice * (100 - discountPercent) / 100)
              : originalPrice
            
            productOrderedTotal += discountedPrice * item.quantity
          })
        }

        // 포인트 사용 금액 조회
        const { data: pointUsage } = await supabase
          .from('point_history')
          .select('points')
          .eq('order_id', order.id)
          .eq('type', 'usage')
          .maybeSingle()

        const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0

        // 쿠폰 할인 금액 조회
        const { data: userCoupon } = await supabase
          .from('user_coupons')
          .select(`
            *,
            coupon:coupons (*)
          `)
          .eq('order_id', order.id)
          .eq('is_used', true)
          .maybeSingle()

        let couponDiscount = 0
        if (userCoupon && userCoupon.coupon) {
          const coupon = userCoupon.coupon as any
          // 쿠폰 할인 금액 계산
          // 즉시할인 후 상품 금액 기준으로 계산
          const afterImmediateDiscount = productOriginalTotal > 0 ? productOriginalTotal : productOrderedTotal
          
          if (coupon.discount_type === 'percentage') {
            couponDiscount = Math.floor(afterImmediateDiscount * (coupon.discount_value / 100))
            if (coupon.max_discount_amount) {
              couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount)
            }
          } else {
            couponDiscount = coupon.discount_value
          }
        }

        // 배송비 계산
        let shipping = 0
        if (order.delivery_type === 'pickup') {
          shipping = 0
        } else if (order.delivery_type === 'quick') {
          shipping = 5000 // QUICK_FEE
        } else if (order.delivery_type === 'regular') {
          // 즉시할인, 쿠폰, 포인트 적용 후 금액
          const afterDiscounts = (productOriginalTotal > 0 ? productOriginalTotal : productOrderedTotal) - couponDiscount - usedPoints
          shipping = afterDiscounts >= 50000 ? 0 : 3000 // FREE_THRESHOLD, DEFAULT_FEE
        }

        // 즉시할인 금액 계산
        // order_items.price는 원가이고, discount_percent로 할인가를 계산했습니다
        let immediateDiscount = Math.max(0, productOriginalTotal - productOrderedTotal)
        
        // 만약 discount_percent 정보가 없어서 즉시할인이 0이면, 총액 역산으로 계산
        if (immediateDiscount === 0) {
          // 총 결제금액 = 상품원가 - 즉시할인 - 쿠폰할인 - 포인트사용 + 배송비
          // 즉시할인 = 상품원가 - 쿠폰할인 - 포인트사용 + 배송비 - 총결제금액
          // 상품원가 = order_items.price 합계 (이미 계산됨)
          const estimatedDiscount = productOriginalTotal - couponDiscount - usedPoints + shipping - order.total_amount
          
          if (estimatedDiscount > 0) {
            immediateDiscount = estimatedDiscount
            // 역산된 할인가로 productOrderedTotal 업데이트
            productOrderedTotal = productOriginalTotal - immediateDiscount
          }
        }

        // 검증: 계산된 총액과 실제 total_amount 비교
        const calculatedTotal = productOriginalTotal - immediateDiscount - couponDiscount - usedPoints + shipping

        return {
          ...order,
          immediateDiscount,
          couponDiscount,
          usedPoints,
          shipping,
          productOriginalTotal,
          productOrderedTotal,
          calculatedTotal, // 디버깅용
        }
      })
    )

    return NextResponse.json(ordersWithDetails)
  } catch (error) {
    console.error('주문 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 주문 상태 변경
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, status } = body

    // 필수 필드 검증
    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId와 status는 필수입니다.' }, { status: 400 })
    }

    // 상태 유효성 검증
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `올바른 주문 상태를 선택해주세요. (${VALID_ORDER_STATUSES.join(', ')})` 
      }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    
    // 이전 상태 확인
    const { data: oldOrder } = await supabase
      .from('orders')
      .select('status, user_id, order_number, total_amount')
      .eq('id', orderId)
      .single()

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('주문 상태 변경 실패:', error)
      return NextResponse.json({ error: '주문 상태 변경에 실패했습니다.' }, { status: 500 })
    }

    // 배송완료로 변경될 때 알림 발송
    if (status === 'delivered' && oldOrder && oldOrder.status !== 'delivered') {
      try {
        // 최종 결제 금액의 1% 포인트 계산
        const pointsToEarn = Math.floor(Math.max(0, oldOrder.total_amount) * 0.01)
        const orderNumber = oldOrder.order_number || orderId.slice(0, 8)
        
        const notificationTitle = '배송 완료'
        const notificationContent = `주문번호 ${orderNumber}가 배송완료 되었습니다. 구매확정을 하시면 ${pointsToEarn.toLocaleString()}P 적립됩니다. 구매확정하기`
        
        // 배송완료 알림 생성
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: oldOrder.user_id,
            title: notificationTitle,
            content: notificationContent,
            type: 'general',
            is_read: false,
          })

        if (notificationError) {
          console.error('배송완료 알림 생성 실패:', notificationError)
          // 알림 생성 실패해도 주문 상태 변경은 성공으로 처리
        } else {
          console.log(`배송완료 알림 생성 성공: 주문 ${orderId}, 사용자 ${oldOrder.user_id}`)
        }
      } catch (error: any) {
        console.error('배송완료 알림 생성 중 예외 발생:', error)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('주문 상태 변경 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

