import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { cancelTossPayment } from '@/lib/payments/toss-server'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  return adminAuth?.value === '1'
}

/** 승인 후 주문 미생성 건 → 토스 결제 취소(환불) 후 draft 삭제 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id 필요' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: draft, error: draftError } = await supabase
      .from('order_drafts')
      .select('id, toss_payment_key, confirm_status')
      .eq('id', id)
      .maybeSingle()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'draft 없음' }, { status: 404 })
    }
    if (draft.confirm_status !== 'approved_not_persisted') {
      return NextResponse.json(
        { error: '복구 대상이 아닙니다. (이미 취소되었거나 다른 상태입니다.)' },
        { status: 400 }
      )
    }
    const paymentKey = draft.toss_payment_key
    if (!paymentKey) {
      return NextResponse.json(
        { error: '결제키가 없어 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    const cancelResult = await cancelTossPayment(
      paymentKey,
      '관리자 결제 취소(승인 후 주문 미생성)'
    )
    if (!cancelResult.ok) {
      return NextResponse.json(
        { error: cancelResult.error || '토스 결제 취소에 실패했습니다.' },
        { status: 400 }
      )
    }

    await supabase.from('order_drafts').delete().eq('id', id)

    return NextResponse.json({ success: true, message: '결제가 취소(환불)되었습니다.' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
