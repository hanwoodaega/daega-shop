import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { handleOrderCancellationPoints } from '@/lib/point/points'
import { cancelTossPayment } from '@/lib/payments/toss-server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { orderIdBodySchema } from '@/lib/validation/schemas/order-payment'

/**
 * 주문 취소 API
 * POST /api/orders/cancel
 *
 * - 토스 결제 건이면 토스 결제 취소 API 호출 후 우리 DB 반영
 * - 포인트 적립 회수 / 사용 포인트 환불
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (order.status !== 'paid' && order.status !== 'ORDER_RECEIVED') {
      return NextResponse.json({
        error: '취소할 수 없는 주문 상태입니다. 주문완료 상태에서만 취소 가능합니다.',
      }, { status: 400 })
    }

    // 토스 결제 건이면 먼저 토스 전액 취소 호출
    const paymentKey = order.toss_payment_key
    if (paymentKey) {
      const tossResult = await cancelTossPayment(paymentKey, '구매자가 취소를 원함')
      if (!tossResult.ok) {
        return NextResponse.json(
          { error: tossResult.error || '결제 취소에 실패했습니다.' },
          { status: 400 }
        )
      }
    }

    const usedPoints = Math.max(0, Number(order.points_used || 0))

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        refund_completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      if (paymentKey) {
        console.error('[orders/cancel] toss cancelled but order update failed', {
          orderId,
          userId: user.id,
          paymentKey,
          error: updateError,
        })
      }
      return NextResponse.json({
        error: '주문 취소 처리에 실패했습니다.',
      }, { status: 500 })
    }

    const pointResult = await handleOrderCancellationPoints(
      user.id,
      orderId,
      order.total_amount,
      usedPoints,
      supabase,
      order.order_number ?? null
    )
    const pointErrors = [...pointResult.errors]
    const pointStatus =
      pointResult.status === 'success'
        ? 'ok'
        : 'needs_recovery'
    if (pointStatus === 'needs_recovery') {
      console.error('[orders/cancel] point recovery needed', {
        orderId,
        userId: user.id,
        pointResult: { ...pointResult, errors: pointErrors },
      })
    }

    return NextResponse.json({
      success: true,
      orderCancelled: true,
      message: '주문이 취소되었습니다. 환불이 완료되었습니다.',
      refund: {
        amount: order.total_amount,
        status: 'completed',
      },
      pointStatus,
      points: {
        deducted: pointResult.deducted,
        refunded: pointResult.refunded,
        status: pointResult.status,
        errors: pointErrors,
      },
    })
  } catch (error: unknown) {
    return unknownErrorResponse('orders/cancel', error)
  }
}

