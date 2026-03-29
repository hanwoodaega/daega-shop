/**
 * approved_not_persisted 상태인 order_drafts를 주문으로 확정하는 cron.
 * CRON_SECRET으로 호출. confirm의 fire-and-forget을 보완(누락 시 주기 처리).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { persistDraftToOrder } from '@/lib/payments/toss-persist-order'
import { requireCronSecret } from '@/lib/auth/internal-job-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  try {
    const denied = requireCronSecret(request)
    if (denied) return denied

    const supabase = createSupabaseAdminClient()
    const { data: drafts, error } = await supabase
      .from('order_drafts')
      .select('id')
      .in('confirm_status', ['approved_not_persisted', 'failed'])

    if (error) {
      console.error('[cron/process-drafts] draft 조회 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = drafts ?? []
    const results: { id: string; ok: boolean; error?: string }[] = []
    for (const d of list) {
      const result = await persistDraftToOrder(d.id)
      results.push({ id: d.id, ok: result.ok, error: result.error })
    }

    return NextResponse.json({
      message: `${list.length}건 처리 완료`,
      processed: list.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[cron/process-drafts]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    )
  }
}
