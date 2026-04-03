import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import { handleOrderCancellationPoints } from '@/lib/point/points'
import { cancelTossPayment } from '@/lib/payments/toss-server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { guestOrderCancelBodySchema } from '@/lib/validation/schemas/order-lookup'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, guestOrderCancelBodySchema)
    if (!parsed.ok) return parsed.response

    const { orderId, token } = parsed.data

    // guestCancelToken 검증 (stateless HMAC 서명)
    let decoded: string
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf8')
    } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    const dotIndex = decoded.lastIndexOf('.')
    if (dotIndex <= 0) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    const raw = decoded.slice(0, dotIndex)
    const sig = decoded.slice(dotIndex + 1)

    if (!sig) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    let payload: { orderId: string; phone: string; exp: string }
    try {
      payload = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    const { orderId: tokenOrderId, phone: tokenPhone, exp: expiresAt } = payload || {}
    if (!tokenOrderId || !tokenPhone || !expiresAt) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    if (tokenOrderId !== orderId) {
      return NextResponse.json({ error: '주문 정보가 일치하지 않습니다.' }, { status: 403 })
    }

    const now = new Date()
    if (new Date(expiresAt) < now) {
      return NextResponse.json({ error: '인증 시간이 만료되었습니다. 다시 인증해주세요.' }, { status: 403 })
    }

    const expected = hashToken(raw)
    if (expected !== sig) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 토큰에 들어 있던 번호와 주문의 수령인 연락처가 일치하는지 한 번 더 확인
    const orderPhoneNorm = normalizePhone(order.recipient_phone || '')
    if (orderPhoneNorm !== tokenPhone) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (order.status !== 'paid' && order.status !== 'ORDER_RECEIVED') {
      return NextResponse.json(
        {
          error: '취소할 수 없는 주문 상태입니다. 주문완료 상태에서만 취소 가능합니다.',
        },
        { status: 400 }
      )
    }

    // 토스 결제 건이면 먼저 토스 전액 취소 호출
    const paymentKey = order.toss_payment_key as string | null
    if (paymentKey) {
      const tossResult = await cancelTossPayment(paymentKey, '비회원 주문조회에서 취소')
      if (!tossResult.ok) {
        return NextResponse.json(
          { error: tossResult.error || '결제 취소에 실패했습니다.' },
          { status: 400 }
        )
      }
    }

    // 사용 포인트 환불/적립 회수: 회원 주문(user_id가 있을 때만)
    const userId = order.user_id as string | null
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
        console.error('[orders/lookup/cancel] toss cancelled but order update failed', {
          orderId,
          userId,
          paymentKey,
          error: updateError,
        })
      }
      return NextResponse.json(
        {
          error: '주문 취소 처리에 실패했습니다.',
        },
        { status: 500 }
      )
    }

    let pointResult: Awaited<ReturnType<typeof handleOrderCancellationPoints>> | null = null
    if (userId) {
      pointResult = await handleOrderCancellationPoints(
        userId,
        orderId,
        order.total_amount,
        usedPoints,
        supabase,
        order.order_number ?? null
      )
      if (pointResult.status !== 'success') {
        console.error('[orders/lookup/cancel] point recovery needed', {
          orderId,
          userId,
          pointResult,
        })
      }
    }

    const pointErrors = pointResult ? [...pointResult.errors] : []
    const pointStatus =
      !pointResult
        ? 'ok'
        : pointResult.status === 'success'
          ? 'ok'
          : 'needs_recovery'
    if (pointStatus === 'needs_recovery') {
      console.error('[orders/lookup/cancel] point recovery needed', {
        orderId,
        userId,
        pointResult: pointResult ? { ...pointResult, errors: pointErrors } : null,
      })
    }

    return NextResponse.json({
      success: true,
      orderCancelled: true,
      pointStatus,
      points: pointResult
        ? {
            deducted: pointResult.deducted,
            refunded: pointResult.refunded,
            status: pointResult.status,
            errors: pointErrors,
          }
        : null,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('orders/lookup/cancel', error)
  }
}

