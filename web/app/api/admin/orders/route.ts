import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { VALID_ORDER_STATUSES } from '@/lib/utils/constants'
import { handleOrderCancellationPoints, addPoints } from '@/lib/point/points'
import { cancelTossPayment } from '@/lib/payments/toss-server'

// GET: 주문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const deliveryType = searchParams.get('delivery_type')
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')
    const orderNumber = searchParams.get('order_number')

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
            price,
            promotion_products (
              promotion_id,
              promotions (
                id,
                type,
                buy_qty,
                discount_percent,
                is_active
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    // 필터 적용
    if (deliveryType) {
      query = query.eq('delivery_type', deliveryType)
    }
    
    // 날짜 필터: 단일 날짜 또는 날짜 범위
    if (startDate && endDate) {
      // 날짜 범위 필터
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.gte('created_at', start.toISOString())
                   .lte('created_at', end.toISOString())
    } else if (date) {
      // 단일 날짜 필터 (기존 방식)
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      query = query.gte('created_at', start.toISOString())
                   .lte('created_at', end.toISOString())
    }

    if (status) {
      query = query.eq('status', status)
    }
    if (orderNumber) {
      query = query.ilike('order_number', `%${orderNumber}%`)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('주문 조회 실패:', error)
      return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
    }

    // 사용자 정보 조회 (선물 주문의 경우 구매자 정보 표시용)
    const userIds = Array.from(new Set((orders || []).map((o: any) => o.user_id)))
    const userMap: Record<string, any> = {}
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds)
      
      if (users) {
        users.forEach((u: any) => {
          userMap[u.id] = u
        })
      }
    }

    // 각 주문에 대해 쿠폰 할인, 포인트 사용, 즉시할인 정보 추가
    const ordersWithDetails = await Promise.all(
      (orders || []).map(async (order: any) => {
        // 상품 원가 합계 계산
        // order_items.price는 주문 시 적용된 단가입니다
        let productOriginalTotal = 0
        let productOrderedTotal = 0
        
        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach((item: any) => {
            // products 테이블의 현재 원가 (변경되었을 수 있음)
            const currentProductPrice = item.product?.price || 0
            const orderedPrice = item.price || 0
            
            // 원가: 상품의 현재 가격 사용 (주문 시점과 다를 수 있음)
            productOriginalTotal += currentProductPrice * item.quantity
            
            // 주문 시점 적용 단가 합계
            productOrderedTotal += orderedPrice * item.quantity
          })
        }

        // 포인트 사용 금액 조회
        // 취소된 주문의 경우 환불 내역도 있을 수 있으므로, 가장 오래된 usage 내역을 찾음
        const { data: pointUsageList } = await supabase
          .from('point_history')
          .select('points, created_at')
          .eq('order_id', order.id)
          .eq('type', 'usage')
          .order('created_at', { ascending: true })
          .limit(1)

        // 가장 오래된 usage 내역이 원래 사용한 포인트 (음수)
        const usedPoints = pointUsageList && pointUsageList.length > 0 && pointUsageList[0].points < 0
          ? Math.abs(pointUsageList[0].points)
          : 0

        // 쿠폰 할인 금액 조회
        // 주문 취소 시 쿠폰은 복구하지 않으므로 is_used=true로 조회
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

        // 배송비 계산 (DB 레거시 quick 는 택배와 동일 규칙)
        let shipping = 0
        if (order.delivery_type === 'pickup') {
          shipping = 0
        } else {
          const afterDiscounts = (productOriginalTotal > 0 ? productOriginalTotal : productOrderedTotal) - couponDiscount - usedPoints
          shipping = afterDiscounts >= 50000 ? 0 : 3000
        }

        // 즉시할인 금액 계산
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
          user: userMap[order.user_id] || null, // 사용자 정보 추가
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
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const body = await request.json()
    const { orderId, status, trackingNumber, trackingCompany } = body

    // 필수 필드 검증 (status 또는 trackingNumber 중 하나는 필수)
    if (!orderId || (!status && !trackingNumber?.trim())) {
      return NextResponse.json({ error: 'orderId와 status 또는 trackingNumber는 필수입니다.' }, { status: 400 })
    }

    // 상태 유효성 검증 (status가 있는 경우에만)
    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `올바른 주문 상태를 선택해주세요. (${VALID_ORDER_STATUSES.join(', ')})` 
      }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    
    // 이전 상태 및 취소 시 필요한 필드 확인
    const { data: oldOrder } = await supabase
      .from('orders')
      .select('status, user_id, order_number, total_amount, toss_payment_key')
      .eq('id', orderId)
      .single()

    if (!oldOrder) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 관리자 취소 시: 토스 결제 취소 + 포인트 처리 후 DB 반영
    if (status === 'cancelled' && oldOrder.status !== 'cancelled') {
      const cancelableStatuses = ['paid', 'ORDER_RECEIVED']
      if (!cancelableStatuses.includes(oldOrder.status)) {
        return NextResponse.json({
          error: `취소할 수 없는 주문 상태입니다. (현재: ${oldOrder.status}) 결제완료/주문접수 상태에서만 취소 가능합니다.`,
        }, { status: 400 })
      }

      const paymentKey = oldOrder.toss_payment_key
      if (paymentKey) {
        const tossResult = await cancelTossPayment(paymentKey, '관리자에 의한 취소')
        if (!tossResult.ok) {
          return NextResponse.json(
            { error: tossResult.error || '토스 결제 취소에 실패했습니다.' },
            { status: 400 }
          )
        }
      }

      const { data: pointUsage } = await supabase
        .from('point_history')
        .select('points')
        .eq('order_id', orderId)
        .eq('type', 'usage')
        .maybeSingle()

      const usedPoints = pointUsage && pointUsage.points != null ? Math.abs(pointUsage.points) : 0

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          refund_completed_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateOrderError) {
        console.error('관리자 주문 취소 DB 반영 실패:', updateOrderError)
        return NextResponse.json({ error: '주문 취소 처리에 실패했습니다.' }, { status: 500 })
      }

      await handleOrderCancellationPoints(
        oldOrder.user_id,
        orderId,
        oldOrder.total_amount,
        usedPoints,
        supabase
      )

      try {
        const orderNumber = oldOrder.order_number || orderId.slice(0, 8)
        const notificationTitle = '환불 완료'
        const notificationContent = `주문번호 ${orderNumber}의 환불이 완료되었습니다. 환불 금액: ${oldOrder.total_amount.toLocaleString()}원`
        
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
          console.error('환불 완료 알림 생성 실패:', notificationError)
        }
      } catch (notificationErr: unknown) {
        console.error('환불 완료 알림 생성 중 예외:', notificationErr)
      }

      const { data: updatedOrder } = await supabase
        .from('orders')
        .select()
        .eq('id', orderId)
        .single()

      return NextResponse.json(updatedOrder)
    }

    // 관리자 구매확정: DELIVERED → CONFIRMED, 포인트 적립 및 알림
    if (status === 'CONFIRMED' && oldOrder.status !== 'CONFIRMED') {
      if (oldOrder.status !== 'DELIVERED') {
        return NextResponse.json({
          error: '배송완료된 주문만 구매확정할 수 있습니다.',
        }, { status: 400 })
      }
      const finalAmount = oldOrder.total_amount
      const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
      const success = await addPoints(
        oldOrder.user_id,
        pointsToAdd,
        'purchase',
        `주문 #${orderId} 구매확정 적립`,
        orderId,
        undefined,
        supabase
      )
      if (!success) {
        return NextResponse.json({ error: '구매확정 처리에 실패했습니다.' }, { status: 500 })
      }
      const { error: statusUpdateError } = await supabase
        .from('orders')
        .update({ status: 'CONFIRMED' })
        .eq('id', orderId)
      if (statusUpdateError) {
        return NextResponse.json({ error: '구매확정 처리에 실패했습니다.' }, { status: 500 })
      }
      const orderNumber = oldOrder.order_number || orderId.slice(0, 8)
      if (pointsToAdd > 0) {
        await supabase.from('notifications').insert({
          user_id: oldOrder.user_id,
          title: `구매확정 ${pointsToAdd.toLocaleString()}P 적립`,
          content: `주문번호 ${orderNumber}가 구매확정이 되어 포인트가 적립되었습니다.`,
          type: 'point',
          is_read: false,
        })
      }
      await supabase.from('notifications').insert({
        user_id: oldOrder.user_id,
        title: '리뷰 작성',
        content: '구매확정이 완료되었습니다. 상품 리뷰를 작성해주세요. 리뷰 작성하기',
        type: 'general',
        is_read: false,
      })
      const { data: updated } = await supabase.from('orders').select().eq('id', orderId).single()
      return NextResponse.json(updated)
    }

    // 업데이트할 데이터 준비 (취소가 아닌 경우 또는 이미 취소된 주문)
    const updateData: Record<string, unknown> = {}
    
    // 주문 상태 변경
    if (status) {
      updateData.status = status
      if (status === 'cancelled') {
        updateData.refund_completed_at = new Date().toISOString()
      }
    }
    
    // 송장번호 입력 시 배송중 상태로 자동 변경
    if (trackingNumber && trackingNumber.trim()) {
      updateData.tracking_number = trackingNumber.trim()
      if (trackingCompany && trackingCompany.trim()) {
        updateData.tracking_company = trackingCompany.trim()
      }
      // 송장번호가 입력되면 자동으로 배송중 상태로 변경
      if (status === 'PREPARING' || !status || status === 'ORDER_RECEIVED') {
        updateData.status = 'IN_TRANSIT'
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('주문 상태 변경 실패:', error)
      return NextResponse.json({ error: '주문 상태 변경에 실패했습니다.' }, { status: 500 })
    }

    // 배송완료로 변경될 때 알림 발송
    const finalStatus = updateData.status as string
    if ((finalStatus === 'DELIVERED' || status === 'DELIVERED') && oldOrder && oldOrder.status !== 'DELIVERED' && oldOrder.status !== 'delivered') {
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

