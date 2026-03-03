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

async function fetchPaymentFromToss(paymentKey: string) {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    return null
  }

  const auth = Buffer.from(`${secretKey}:`).toString('base64')
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}

function mapTossStatusToOrderStatus(status?: TossPaymentStatus) {
  if (!status) return null
  if (status === 'DONE') return 'ORDER_RECEIVED'
  if (status === 'CANCELED' || status === 'PARTIAL_CANCELED' || status === 'ABORTED' || status === 'EXPIRED') {
    return 'cancelled'
  }
  return null
}

function shouldUpdateOrderStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return false
  if (nextStatus === 'cancelled') {
    return ['pending', 'ORDER_RECEIVED', 'PREPARING'].includes(currentStatus)
  }
  if (nextStatus === 'ORDER_RECEIVED') {
    return currentStatus === 'pending'
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as TossWebhookPayload
    if (payload.eventType !== 'PAYMENT_STATUS_CHANGED') {
      return NextResponse.json({ received: true })
    }

    const data = payload.data || {}
    let paymentKey = data.paymentKey || ''
    let orderId = data.orderId || ''
    let status = data.status

    if (paymentKey) {
      const payment = await fetchPaymentFromToss(paymentKey)
      if (payment?.orderId) {
        orderId = payment.orderId
      }
      if (payment?.status) {
        status = payment.status as TossPaymentStatus
      }
    }

    if (!orderId) {
      return NextResponse.json({ received: true })
    }

    const nextStatus = mapTossStatusToOrderStatus(status)
    if (!nextStatus) {
      return NextResponse.json({ received: true })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, toss_payment_key')
      .eq('toss_order_id', orderId)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ received: true })
    }

    const updateData: Record<string, any> = {}
    if (paymentKey && !order.toss_payment_key) {
      updateData.toss_payment_key = paymentKey
    }
    if (shouldUpdateOrderStatus(order.status, nextStatus)) {
      updateData.status = nextStatus
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()
      await supabaseAdmin.from('orders').update(updateData).eq('id', order.id)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Toss webhook 처리 오류:', error)
    return NextResponse.json({ received: true })
  }
}
