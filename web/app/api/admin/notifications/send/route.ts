import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// POST /api/admin/notifications/send
// { type: 'confirm' | 'review', orderIds: string[] }
export async function POST(request: NextRequest) {
  try {
    try { assertAdmin() } catch (e: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createSupabaseServerClient()
    const body = await request.json()
    const { type, orderIds } = body as { type?: 'confirm' | 'review', orderIds?: string[] }
    if (!type || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // 여기서는 실제 발송 대신, 발송 완료 타임스탬프만 기록 (수동 프로세스 추적)
    const now = new Date().toISOString()
    const updateData = type === 'confirm'
      ? { confirm_reminder_sent_at: now }
      : { review_request_sent_at: now }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .in('id', orderIds)
    if (error) {
      return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, updated: orderIds.length })
  } catch (error) {
    console.error('알림 발송 처리 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}


