import { NextRequest, NextResponse } from 'next/server'
import { persistDraftToOrder } from '@/lib/payments/toss-persist-order'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

/** approved_not_persisted draft → 주문 생성(재처리). 관리자 전용 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await ensureAdminApi()
    if (unauthorized) return unauthorized

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id 필요' }, { status: 400 })
    }

    const result = await persistDraftToOrder(id)
    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: '주문이 생성되었습니다.',
        order: result.order,
      })
    }
    return NextResponse.json(
      { error: result.error || '재처리 실패' },
      { status: 400 }
    )
  } catch (e) {
    console.error('[admin/recovery/process]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
