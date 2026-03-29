import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

export async function GET(
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

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('order_drafts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return dbErrorResponse('admin order-drafts recovery [id] GET', error)
    }
    if (!data) {
      return NextResponse.json({ error: 'draft 없음' }, { status: 404 })
    }

    return NextResponse.json({ draft: data })
  } catch (e: unknown) {
    return unknownErrorResponse('admin order-drafts recovery [id] GET', e)
  }
}
