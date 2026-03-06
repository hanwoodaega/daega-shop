import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { handleOrderCancellationPoints } from '@/lib/point/points'

/**
 * 토스 결제 전액 취소 API 호출
 * 성공 시 true, 실패 시 false (에러 내용은 로그)
 */
async function cancelTossPayment(paymentKey: string, cancelReason: string): Promise<{ ok: boolean; error?: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    console.warn('[orders/cancel] TOSS_SECRET_KEY 없음')
    return { ok: false, error: '결제 취소 설정이 없습니다.' }
  }
  const auth = Buffer.from(`${secretKey}:`).toString('base64')
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const msg = errBody?.message || errBody?.code || res.statusText
      console.error('[orders/cancel] 토스 취소 실패:', res.status, msg)
      return { ok: false, error: msg || '결제 취소에 실패했습니다.' }
    }
    return { ok: true }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    console.error('[orders/cancel] 토스 취소 요청 예외:', err)
    return { ok: false, error: '결제 취소 요청 중 오류가 발생했습니다.' }
  }
}

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
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 })
    }

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

    const { data: pointUsage } = await supabase
      .from('point_history')
      .select('points')
      .eq('order_id', orderId)
      .eq('type', 'usage')
      .maybeSingle()

    const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        refund_status: 'pending',
        refund_amount: order.total_amount,
        refund_requested_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({
        error: '주문 취소 처리에 실패했습니다.',
      }, { status: 500 })
    }

    const pointResult = await handleOrderCancellationPoints(
      user.id,
      orderId,
      order.total_amount,
      usedPoints
    )

    return NextResponse.json({
      success: true,
      message: '주문이 취소되었습니다. 환불이 진행됩니다.',
      refund: {
        amount: order.total_amount,
        status: 'pending',
      },
      points: {
        deducted: pointResult.deducted,
        refunded: pointResult.refunded,
      },
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('주문 취소 실패:', err)
    return NextResponse.json(
      { error: err.message || '서버 오류' },
      { status: 500 }
    )
  }
}

