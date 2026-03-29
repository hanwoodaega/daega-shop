import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getTrackingStatus, mapTrackingStatusToOrderStatus } from '@/lib/tracking/tracking-api'
import { requireWorkerSharedSecret } from '@/lib/auth/internal-job-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Worker: 배송 상태 업데이트
 * `Authorization: Bearer ${WORKER_SECRET || CRON_SECRET}` (production 필수)
 */
export async function POST(request: NextRequest) {
  try {
    const denied = requireWorkerSharedSecret(request)
    if (denied) return denied

    const supabase = createSupabaseAdminClient()

    // 송장번호가 있고 배송 완료되지 않은 주문 조회
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_number, status')
      .not('tracking_number', 'is', null)
      .neq('status', 'DELIVERED')
      .neq('status', 'delivered')
      .neq('status', 'cancelled')
      .in('status', ['IN_TRANSIT'])

    if (fetchError) {
      return dbErrorResponse('worker/update-tracking-status fetch', fetchError)
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        message: '업데이트할 주문이 없습니다.',
        updated: 0,
        total: 0
      })
    }

    let updatedCount = 0
    const errors: string[] = []

    console.log(`[Worker] ${orders.length}개 주문의 배송 상태를 확인합니다...`)

    // 각 주문의 배송 상태 조회 및 업데이트
    for (const order of orders) {
      if (!order.tracking_number) {
        continue
      }

      try {
        // 롯데택배로 고정
        const trackingStatus = await getTrackingStatus(
          '롯데택배',
          order.tracking_number
        )

        if (!trackingStatus) {
          // API 연동이 완료되지 않았거나 조회 실패
          console.log(`[Worker] 주문 ${order.id}: 배송조회 API 미연동 또는 조회 실패`)
          continue
        }

        const newStatus = mapTrackingStatusToOrderStatus(trackingStatus.status)

        // 상태가 변경된 경우에만 업데이트
        if (newStatus !== order.status) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id)

          if (updateError) {
            console.error(`[Worker] 주문 ${order.id} 상태 업데이트 실패:`, updateError)
            errors.push(`주문 ${order.id}: 상태 업데이트 실패`)
          } else {
            updatedCount++
            console.log(`[Worker] 주문 ${order.id} 상태 업데이트: ${order.status} -> ${newStatus}`)
          }
        } else {
          console.log(`[Worker] 주문 ${order.id}: 상태 변경 없음 (현재: ${order.status})`)
        }
      } catch (error: unknown) {
        console.error(`[Worker] 주문 ${order.id} 배송조회 실패:`, error)
        errors.push(`주문 ${order.id}: 배송조회 실패`)
      }
    }

    const result = {
      message: `${updatedCount}개 주문의 배송 상태가 업데이트되었습니다.`,
      updated: updatedCount,
      total: orders.length,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined
    }

    console.log(`[Worker] 작업 완료:`, result)

    return NextResponse.json(result)
  } catch (error: unknown) {
    return unknownErrorResponse('worker/update-tracking-status', error)
  }
}

/** GET: 상태 확인 — production에서는 Worker와 동일한 Bearer 필요 */
export async function GET(request: NextRequest) {
  const denied = requireWorkerSharedSecret(request)
  if (denied) return denied

  return NextResponse.json({
    status: 'ok',
    service: 'tracking-status-worker',
    timestamp: new Date().toISOString(),
  })
}

