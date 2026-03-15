import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 만료된 order_drafts 삭제.
 * Cron(CRON_SECRET)으로 주기 호출하거나 수동 호출.
 * - confirm_status가 null(미승인)이고 expires_at < now() 인 행만 삭제.
 * - approved_not_persisted / persisting / done / failed 는 보존(복구·감사용).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('order_drafts')
      .delete()
      .lt('expires_at', now)
      .is('confirm_status', null)
      .select('id')

    if (error) {
      console.error('[cleanup-drafts]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const deletedCount = data?.length ?? 0
    if (deletedCount > 0) {
      console.log(`[cleanup-drafts] 만료 draft ${deletedCount}건 삭제`)
    }

    return NextResponse.json({
      message: '만료된 주문 초안 정리 완료',
      deletedCount,
      timestamp: now,
    })
  } catch (error: unknown) {
    console.error('[cleanup-drafts]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}
