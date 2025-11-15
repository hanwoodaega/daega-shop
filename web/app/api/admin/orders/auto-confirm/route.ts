import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { addPoints } from '@/lib/points'

/**
 * 자동 구매확정 API (관리자 수동 실행)
 * GET /api/admin/orders/auto-confirm
 * 
 * 관리자가 수동으로 실행하는 자동 구매확정 기능입니다.
 * 배송완료 후 7일이 지난 모든 주문을 자동으로 구매확정하고 포인트를 적립합니다.
 */
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const { assertAdmin } = await import('@/lib/admin-auth')
    try {
      assertAdmin()
    } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // 배송완료 후 7일이 지난 주문 조회
    // updated_at이 배송완료 상태로 변경된 시점을 나타냄
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // 배송완료된 주문 중 7일 이상 지난 주문 조회
    // status='delivered'이고 updated_at이 7일 이상 지난 주문
    const { data: oldDeliveredOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'delivered')
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

    // 이미 구매확정된 주문 필터링
    const orderIds = oldDeliveredOrders.map(o => o.id)
    const { data: confirmedOrders } = await supabase
      .from('point_history')
      .select('order_id')
      .in('order_id', orderIds)
      .eq('type', 'purchase')

    const confirmedOrderIds = new Set(
      confirmedOrders?.map(c => c.order_id) || []
    )

    const unconfirmedOrders = oldDeliveredOrders.filter(
      o => !confirmedOrderIds.has(o.id)
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
        // 사용한 포인트 확인
        const { data: pointUsage } = await supabase
          .from('point_history')
          .select('points')
          .eq('order_id', order.id)
          .eq('type', 'usage')
          .single()

        const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0
        const finalAmount = order.total_amount - usedPoints

        // 포인트 적립 (최종 결제 금액의 1%)
        const pointsToAdd = Math.floor(Math.max(0, finalAmount) * 0.01)
        
        if (pointsToAdd > 0) {
          const success = await addPoints(
            order.user_id,
            pointsToAdd,
            'purchase',
            `주문 #${order.id} 자동 구매확정 적립`,
            order.id
          )

          if (success) {
            successCount++
          } else {
            errors.push(`주문 #${order.id} 포인트 적립 실패`)
          }
        } else {
          // 포인트가 0이어도 구매확정은 완료된 것으로 처리
          successCount++
        }
      } catch (error: any) {
        console.error(`주문 #${order.id} 자동 구매확정 실패:`, error)
        errors.push(`주문 #${order.id}: ${error.message || '처리 실패'}`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${successCount}개 주문이 자동 구매확정되었습니다.`,
      confirmedCount: successCount,
      totalOrders: oldDeliveredOrders.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('자동 구매확정 실패:', error)
    return NextResponse.json({ 
      error: error.message || '서버 오류' 
    }, { status: 500 })
  }
}

