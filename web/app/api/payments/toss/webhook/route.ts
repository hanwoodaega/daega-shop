/**
 * 토스 웹훅: PAYMENT_STATUS_CHANGED 등
 * - 공식 문서: `tosspayments-webhook-signature` 헤더는 payout.changed / seller.changed 에만 포함됨.
 *   결제 상태 변경은 서명 헤더 없이 올 수 있으므로, 아래에서는 paymentKey로 결제 조회 API로 상태를 재확인한다.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export const runtime = 'nodejs'

type TossPaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'ABORTED'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'EXPIRED'
  | 'WAITING_FOR_DEPOSIT'

interface TossWebhookPayload {
  eventType?: string
  createdAt?: string
  data?: {
    paymentKey?: string
    orderId?: string
    status?: TossPaymentStatus
  }
}

const OK = () => NextResponse.json({ ok: true, received: true })

async function fetchPaymentFromToss(paymentKey: string) {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return null
  const auth = Buffer.from(`${secretKey}:`).toString('base64')
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) return null
  return res.json()
}

function mapTossStatusToOrderStatus(status?: TossPaymentStatus) {
  if (!status) return null
  if (status === 'DONE') return 'ORDER_RECEIVED'
  if (['CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED'].includes(status)) return 'cancelled'
  return null
}

function shouldUpdateOrderStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return false
  if (nextStatus === 'cancelled') return ['pending', 'ORDER_RECEIVED', 'PREPARING'].includes(currentStatus)
  if (nextStatus === 'ORDER_RECEIVED') return currentStatus === 'pending'
  return false
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TossWebhookPayload
    const eventType = payload.eventType
    const data = payload.data || {}
    let paymentKey = data.paymentKey || ''
    let orderId = data.orderId || ''
    let status = data.status

    if (eventType !== 'PAYMENT_STATUS_CHANGED') {
      return OK()
    }

    // 본문만 믿고 DB를 갱신하지 않음: paymentKey로 토스 API 재조회로 검증
    if (!paymentKey) {
      console.warn('[Toss webhook] PAYMENT_STATUS_CHANGED without paymentKey, skip')
      return OK()
    }

    const payment = await fetchPaymentFromToss(paymentKey)
    if (!payment) {
      console.warn('[Toss webhook] paymentKey 조회 실패:', paymentKey)
      return OK()
    }
    orderId = typeof payment.orderId === 'string' ? payment.orderId : orderId
    status = (payment.status as TossPaymentStatus) || status

    // 로그: eventType, paymentKey, orderId (추적용)
    console.log('[Toss webhook]', { eventType, paymentKey, orderId: orderId || '(없음)' })

    if (!orderId) {
      return OK()
    }

    const nextStatus = mapTossStatusToOrderStatus(status)
    if (!nextStatus) {
      return OK()
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, toss_payment_key')
      .eq('toss_order_id', orderId)
      .maybeSingle()

    if (!order) {
      return OK()
    }

    // 이미 결제완료(ORDER_RECEIVED)면 바로 200 — 재처리 안 함
    if (order.status === 'ORDER_RECEIVED') {
      return OK()
    }

    // 같은 orderId / 상태 이미 반영됐으면 재처리 안 함
    if (order.status === nextStatus && (!paymentKey || order.toss_payment_key)) {
      return OK()
    }

    const updateData: Record<string, unknown> = {}
    if (paymentKey && !order.toss_payment_key) updateData.toss_payment_key = paymentKey
    if (shouldUpdateOrderStatus(order.status, nextStatus)) updateData.status = nextStatus

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()
      await supabaseAdmin.from('orders').update(updateData).eq('id', order.id)
    }

    return OK()
  } catch (error: unknown) {
    console.error('[Toss webhook] 처리 오류:', error)
    return OK()
  }
}
