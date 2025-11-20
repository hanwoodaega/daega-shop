import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { gift_target, gift_display_order } = body

  const updates: Record<string, any> = {}
  if ('gift_target' in body) {
    updates.gift_target = gift_target
  }
  if ('gift_display_order' in body) {
    updates.gift_display_order = gift_display_order !== null && gift_display_order !== undefined
      ? Number(gift_display_order)
      : null
  }

  try {
    const { error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('선물 대상 업데이트 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

