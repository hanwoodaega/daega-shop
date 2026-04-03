import { NextRequest, NextResponse } from 'next/server'
import { logApiError, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { addPoints } from '@/lib/point/points'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

/**
 * 자동 구매확정 API (관리자 수동 실행)
 * GET /api/admin/orders/auto-confirm
 * 
 * 관리자가 수동으로 실행하는 자동 구매확정 기능입니다.
 * 배송완료 후 7일이 지난 모든 주문을 자동으로 구매확정하고 포인트를 적립합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const supabase = createSupabaseAdminClient()

    // 배송완료 후 7일이 지난 주문 조회
    // updated_at이 배송완료 상태로 변경된 시점을 나타냄
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // 배송완료된 주문 중 7일 이상 지난 주문 조회
    // status='DELIVERED'이고 updated_at이 7일 이상 지난 주문
    const { data: oldDeliveredOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'DELIVERED')
      .lt('updated_at', sevenDaysAgoISO) // 배송완료 후 7일 이상 지난 주문
      .order('updated_at', { ascending: true })

    if (ordersError) {
      console.error('주문 조회 실패:', ordersError)
      return NextResponse.json({ error: '주문 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!oldDeliveredOrders || oldDeliveredOrders.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: '자동 구매확정할 주문이 없습니다.',
        confirmedCount: 0
      })
    }

    // 이미 구매확정된 주문 필터링 (status !== 'CONFIRMED' 인 주문만)
    const unconfirmedOrders = oldDeliveredOrders.filter(
      (o) => o.status !== 'CONFIRMED'
    )

    if (unconfirmedOrders.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: '자동 구매확정할 주문이 없습니다.',
        confirmedCount: 0
      })
    }

    // 각 주문에 대해 포인트 적립
    let successCount = 0
    const errors: string[] = []

    for (const order of unconfirmedOrders) {
      try {
        // 주문 생성 시 total_amount에 이미 최종 결제 금액(상품금액 - 할인 - 쿠폰 - 포인트)이 저장되어 있습니다.
        // 따라서 order.total_amount가 바로 최종 결제 금액입니다.
        const finalAmount = order.total_amount

        // 포인트 적립 (최종 결제 금액의 1%)
        const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
        const orderNumber = order.order_number || order.id.slice(0, 8)
        
        if (pointsToAdd > 0) {
          const success = await addPoints(
            order.user_id,
            pointsToAdd,
            'purchase',
            `주문 #${orderNumber} 자동 구매확정 적립`,
            order.id,
            undefined,
            supabase
          )

          if (success) {
            // 주문 상태를 CONFIRMED로 업데이트
            const { error: statusUpdateError } = await supabase
              .from('orders')
              .update({ status: 'CONFIRMED' })
              .eq('id', order.id)

            if (statusUpdateError) {
              console.error(`주문 ${order.id} CONFIRMED 상태 업데이트 실패:`, statusUpdateError)
            }

            // 구매확정 알림 생성
            const notificationTitle = `구매확정 ${pointsToAdd.toLocaleString()}P 적립`
            const notificationContent = `주문번호 ${orderNumber}가 구매확정이 되어 포인트가 적립되었습니다.`

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: order.user_id,
              title: notificationTitle,
              content: notificationContent,
              type: 'point',
              is_read: false,
            })

          if (notificationError) {
            console.error(`주문 ${order.id} 구매확정 알림 생성 실패:`, notificationError)
          } else {
            // 리뷰 작성 알림 생성
            const reviewNotificationTitle = '리뷰 작성'
            const reviewNotificationContent = `구매확정이 완료되었습니다. 상품 리뷰를 작성해주세요. 리뷰 작성하기`

            const { error: reviewNotificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: order.user_id,
                title: reviewNotificationTitle,
                content: reviewNotificationContent,
                type: 'general',
                is_read: false,
              })

            if (reviewNotificationError) {
              console.error(`주문 ${order.id} 리뷰 작성 알림 생성 실패:`, reviewNotificationError)
            }
          }

            if (notificationError) {
              console.error(`주문 #${order.id} 알림 생성 실패:`, notificationError)
              // 알림 생성 실패해도 구매확정은 성공으로 처리
            }

            successCount++
          } else {
            errors.push(`주문 #${order.id} 포인트 적립 실패`)
          }
        } else {
          // 포인트가 0이어도 구매확정은 완료된 것으로 처리
          const { error: statusUpdateError } = await supabase
            .from('orders')
            .update({ status: 'CONFIRMED' })
            .eq('id', order.id)

          if (statusUpdateError) {
            console.error(`주문 ${order.id} CONFIRMED 상태 업데이트 실패(포인트 0):`, statusUpdateError)
          }
          successCount++
        }
      } catch (error: unknown) {
        logApiError(`admin auto-confirm order ${order.id}`, error)
        errors.push(`주문 #${order.id}: 처리 실패`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${successCount}개 주문이 자동 구매확정되었습니다.`,
      confirmedCount: successCount,
      totalOrders: oldDeliveredOrders.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: unknown) {
    return unknownErrorResponse('admin orders auto-confirm', error)
  }
}

