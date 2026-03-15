import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  return adminAuth?.value === '1'
}

/** 승인 후 주문 미생성 draft 목록 (복구 대상: approved_not_persisted + failed) */
export async function GET() {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('order_drafts')
      .select('id, amount, tax_free_amount, toss_payment_key, toss_approved_at, confirm_status, payload, created_at')
      .in('confirm_status', ['approved_not_persisted', 'failed'])
      .order('toss_approved_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = (data || []).map((row) => {
      const payload = (row.payload as Record<string, unknown>) || {}
      const shippingName = typeof payload.shipping_name === 'string' ? payload.shipping_name : ''
      const shippingPhone = typeof payload.shipping_phone === 'string' ? payload.shipping_phone : (typeof payload.orderer_phone === 'string' ? payload.orderer_phone : '')
      return {
        id: row.id,
        amount: row.amount,
        tax_free_amount: row.tax_free_amount ?? 0,
        toss_payment_key: row.toss_payment_key ?? '',
        toss_approved_at: row.toss_approved_at ?? null,
        confirm_status: row.confirm_status ?? '',
        orderer_name: shippingName,
        orderer_phone: shippingPhone,
        created_at: row.created_at,
      }
    })

    return NextResponse.json({ items: list })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
