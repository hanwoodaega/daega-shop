import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'

/**
 * 구매확정 API
 * POST /api/orders/confirm
 * 
 * 배송완료된 주문을 구매확정하고 포인트를 적립합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 })
    }

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

    // 배송완료 상태인지 확인
    if (order.status !== 'delivered') {
      return NextResponse.json({ 
        error: '배송완료된 주문만 구매확정할 수 있습니다.' 
      }, { status: 400 })
    }

    // 이미 구매확정되었는지 확인 (point_history에서 확인)
    const { data: existingPoints } = await supabase
      .from('point_history')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'purchase')
      .single()

    if (existingPoints) {
      return NextResponse.json({ 
        error: '이미 구매확정된 주문입니다.' 
      }, { status: 400 })
    }

    // 주문 생성 시 finalAmount = total_amount - couponDiscount - usedPoints로 계산되어
    // orders 테이블의 total_amount에 이미 최종 결제 금액이 저장되어 있습니다.
    // 따라서 order.total_amount가 바로 최종 결제 금액입니다.
    const finalAmount = order.total_amount

    // 포인트 적립 (최종 결제 금액의 1%)
    const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
    
    if (pointsToAdd > 0) {
      const success = await addPoints(
        user.id,
        pointsToAdd,
        'purchase',
        `주문 #${order.id} 구매확정 적립`,
        order.id
      )

      if (!success) {
        return NextResponse.json({ 
          error: '포인트 적립에 실패했습니다.' 
        }, { status: 500 })
      }

      // 구매확정 포인트 적립 알림 생성
      const orderNumber = order.order_number || order.id.slice(0, 8)
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

      // 리뷰 작성 알림 생성
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
    }

    return NextResponse.json({ 
      success: true,
      message: '구매확정이 완료되었습니다.',
      pointsEarned: pointsToAdd
    })
  } catch (error: any) {
    console.error('구매확정 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류' 
    }, { status: 500 })
  }
}

