/**
 * toss_order_id로 주문 조회 (결제 성공 페이지 폴링용).
 * worker가 주문 생성 완료 시까지 404, 완료 후 200 + order (redirectTo 구성에 필요한 필드만).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json({ error: 'orderId 필요' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, user_id, gift_token, shipping_phone')
      .eq('toss_order_id', orderId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    const res = NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        gift_token: order.gift_token ?? null,
        shipping_phone: order.shipping_phone ?? null,
      },
    })

    // 비회원 주문이면 세션용 조회 쿠키 설정 (order-lookup 전용, 짧은 만료)
    if (!order.user_id) {
      const payload = {
        orderId: order.id,
        createdAt: new Date().toISOString(),
      }
      res.cookies.set('guest_order_lookup', JSON.stringify(payload), {
        path: '/api/orders/lookup',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 30, // 30분
      })
    }

    return res
  } catch (e) {
    console.error('[by-toss-order-id]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    )
  }
}
