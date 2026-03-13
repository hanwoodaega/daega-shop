import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import { handleOrderCancellationPoints } from '@/lib/point/points'
import { cancelTossPayment } from '@/lib/payments/toss-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, token } = body as { orderId?: string; token?: string }

    if (!orderId || !token) {
      return NextResponse.json({ error: '주문 ID와 토큰이 필요합니다.' }, { status: 400 })
    }

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
    const orderPhoneNorm = normalizePhone(order.shipping_phone || '')
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
    let usedPoints = 0
    if (userId) {
      const { data: pointUsage } = await supabase
        .from('point_history')
        .select('points')
        .eq('order_id', orderId)
        .eq('type', 'usage')
        .maybeSingle()

      usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        refund_completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json(
        {
          error: '주문 취소 처리에 실패했습니다.',
        },
        { status: 500 }
      )
    }

    if (userId) {
      await handleOrderCancellationPoints(
        userId,
        orderId,
        order.total_amount,
        usedPoints
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('비회원 주문 취소 실패:', err)
    return NextResponse.json(
      { error: err.message || '서버 오류' },
      { status: 500 }
    )
  }
}

