/**
 * draft(approved_not_persisted) 1건을 주문으로 확정하는 worker 엔드포인트.
 * - confirm에서 fire-and-forget으로 호출하거나, cron/process-drafts에서 호출.
 * - CRON_SECRET으로 인증 (선택).
 */

import { NextRequest, NextResponse } from 'next/server'
import { persistDraftToOrder } from '@/lib/payments/toss-persist-order'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orderId = body.orderId ?? body.draftId
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId(draftId) 필요' }, { status: 400 })
    }

    const result = await persistDraftToOrder(orderId)
    if (result.ok) {
      return NextResponse.json({ success: true, orderId, order: result.order })
    }
    const isConflict = result.error === 'already_processing' || (result.error?.startsWith?.('invalid_status:') ?? false)
    return NextResponse.json(
      { success: false, orderId, error: result.error },
      { status: isConflict ? 409 : 500 }
    )
  } catch (e) {
    console.error('[process-draft]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    )
  }
}
