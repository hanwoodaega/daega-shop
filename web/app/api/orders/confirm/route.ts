import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { addPoints } from '@/lib/point/points'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { orderIdBodySchema } from '@/lib/validation/schemas/order-payment'

/**
 * 구매확정 API
 * POST /api/orders/confirm
 * 
 * 배송완료된 주문을 구매확정하고 포인트를 적립합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const parsed = await parseJsonBody(request, orderIdBodySchema)
    if (!parsed.ok) return parsed.response
    const { orderId } = parsed.data

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이미 구매확정된 주문인지 확인 (status 기반)
    if (order.status === 'CONFIRMED') {
      return NextResponse.json({
        error: '이미 구매확정된 주문입니다.',
      }, { status: 400 })
    }

    // 배송완료 상태인지 확인 (DELIVERED → CONFIRMED 으로만 전이)
    if (order.status !== 'DELIVERED') {
      return NextResponse.json({ 
        error: '배송완료된 주문만 구매확정할 수 있습니다.' 
      }, { status: 400 })
    }

    // 주문 생성 시 finalAmount = total_amount - couponDiscount - usedPoints로 계산되어
    // orders 테이블의 total_amount에 이미 최종 결제 금액이 저장되어 있습니다.
    // 따라서 order.total_amount가 바로 최종 결제 금액입니다.
    const finalAmount = order.total_amount

    // 포인트 적립 (최종 결제 금액의 1%)
    const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
    const orderNumber = order.order_number || order.id.slice(0, 8)
    
    // 포인트가 0이어도 구매확정 기록을 남기기 위해 항상 addPoints 호출
    // (리뷰 작성 가능 여부 확인을 위해 point_history에 order_id가 필요)
    const success = await addPoints(
      user.id,
      pointsToAdd,
      'purchase',
      `주문 #${orderNumber} 구매확정 적립`,
      order.id, // order_id 전달
      undefined,
      supabase
    )

    if (!success) {
      console.error('구매확정 포인트 적립 실패:', {
        userId: user.id,
        orderId: order.id,
        pointsToAdd,
      })
      return NextResponse.json({ 
        error: '구매확정 처리에 실패했습니다.' 
      }, { status: 500 })
    }

    // 구매확정 기록이 제대로 저장되었는지 확인
    const { data: verifyHistory, error: verifyError } = await supabase
      .from('point_history')
      .select('id, order_id, points, type')
      .eq('user_id', user.id)
      .eq('order_id', order.id)
      .eq('type', 'purchase')
      .not('order_id', 'is', null) // order_id가 null이 아닌 것만
      .maybeSingle()

    if (verifyError) {
      console.error('구매확정 기록 확인 실패:', {
        userId: user.id,
        orderId: order.id,
        error: verifyError,
      })
      // 에러가 있어도 성공으로 처리 (이미 addPoints에서 처리했으므로)
    } else if (!verifyHistory || !verifyHistory.order_id) {
      console.error('구매확정 기록이 저장되지 않았거나 order_id가 null입니다:', {
        userId: user.id,
        orderId: order.id,
        verifyHistory,
      })
      // 기록이 없거나 order_id가 null이면 실패로 처리
      return NextResponse.json({ 
        error: '구매확정 기록 저장에 실패했습니다.' 
      }, { status: 500 })
    }

    // 주문 상태를 CONFIRMED로 업데이트 (구매확정 완료)
    const { error: statusUpdateError } = await supabase
      .from('orders')
      .update({ status: 'CONFIRMED' })
      .eq('id', order.id)

    if (statusUpdateError) {
      console.error('구매확정 상태 업데이트 실패:', statusUpdateError)
      return NextResponse.json({ 
        error: '구매확정 처리에 실패했습니다.' 
      }, { status: 500 })
    }

    // 포인트가 0보다 클 때만 알림 생성
    if (pointsToAdd > 0) {
      // 구매확정 포인트 적립 알림 생성
      const notificationTitle = `구매확정 ${pointsToAdd.toLocaleString()}P 적립`
      const notificationContent = `주문번호 ${orderNumber}가 구매확정이 되어 포인트가 적립되었습니다.`

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: notificationTitle,
          content: notificationContent,
          type: 'point',
          is_read: false,
        })

      if (notificationError) {
        console.error('구매확정 알림 생성 실패:', notificationError)
        // 알림 생성 실패해도 구매확정은 성공으로 처리
      }
    }

    // 리뷰 작성 알림 생성 (포인트와 관계없이 항상 생성)
    const reviewNotificationTitle = '리뷰 작성'
    const reviewNotificationContent = `구매확정이 완료되었습니다. 상품 리뷰를 작성해주세요. 리뷰 작성하기`

    const { error: reviewNotificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: reviewNotificationTitle,
        content: reviewNotificationContent,
        type: 'general',
        is_read: false,
      })

    if (reviewNotificationError) {
      console.error('리뷰 작성 알림 생성 실패:', reviewNotificationError)
      // 알림 생성 실패해도 구매확정은 성공으로 처리
    }

    return NextResponse.json({ 
      success: true,
      message: '구매확정이 완료되었습니다.',
      pointsEarned: pointsToAdd
    })
  } catch (error: unknown) {
    return unknownErrorResponse('orders/confirm', error)
  }
}

