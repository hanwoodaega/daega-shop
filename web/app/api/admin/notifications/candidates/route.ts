import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/admin/notifications/candidates?type=confirm|review
export async function GET(request: NextRequest) {
  try {
    try { assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createSupabaseServerClient()
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'confirm'

    // 어제의 날짜 범위 계산 (UTC 기준)
    const now = new Date()
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const start = new Date(y.getTime() - 24 * 60 * 60 * 1000) // 어제 00:00 UTC
    const end = new Date(y.getTime()) // 오늘 00:00 UTC

    // status/flag 컬럼이 없을 수 있으므로 쿼리 조건을 두 단계로 시도
    if (type === 'confirm') {
      // 배송완료 yesterday AND confirm_reminder_sent_at IS NULL
      const { data, error } = await supabase
        .from('orders')
        .select('id, user_id, order_number, updated_at, status, shipping_name, shipping_phone')
        .eq('status', 'delivered')
        .gte('updated_at', start.toISOString())
        .lt('updated_at', end.toISOString())
        .is('confirm_reminder_sent_at', null)
      if (error) {
        // 폴백: confirm_reminder_sent_at 컬럼이 없을 수 있으니 컬럼 조건 제거
        const fb = await supabase
          .from('orders')
          .select('id, user_id, order_number, updated_at, status, shipping_name, shipping_phone')
          .eq('status', 'delivered')
          .gte('updated_at', start.toISOString())
          .lt('updated_at', end.toISOString())
        return NextResponse.json({ orders: fb.data || [] })
      }
      return NextResponse.json({ orders: data || [] })
    } else {
      // 구매확정 yesterday = point_history(type='purchase')가 어제 생성된 주문
      // review_request_sent_at 미발송인 주문만
      const { data: histories, error: histErr } = await supabase
        .from('point_history')
        .select('order_id, user_id, created_at')
        .eq('type', 'purchase')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
      if (histErr) {
        return NextResponse.json({ orders: [] })
      }
      const orderIds = (histories || [])
        .map((h: any) => h.order_id)
        .filter((id: any): id is string => Boolean(id))
      if (orderIds.length === 0) {
        return NextResponse.json({ orders: [] })
      }
      // 주문 상세 조회 + 미발송 필터
      const { data: orders, error: ordErr } = await supabase
        .from('orders')
        .select('id, user_id, order_number, updated_at, status, shipping_name, shipping_phone, review_request_sent_at')
        .in('id', orderIds)
      if (ordErr) {
        return NextResponse.json({ orders: [] })
      }
      const filtered = (orders || []).filter((o: any) => !o.review_request_sent_at)
      return NextResponse.json({ orders: filtered })
    }
  } catch (error) {
    console.error('알림 대상 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}


