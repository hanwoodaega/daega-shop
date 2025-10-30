import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try { assertAdmin() } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  const allowed = ['brand','name','description','price','image_url','category','stock','unit','weight','origin','discount_percent'] as const
  const updates: Record<string, any> = {}
  for (const key of allowed) if (key in body) updates[key] = body[key]
  if ('discount_percent' in updates) {
    const v = Number(updates.discount_percent)
    updates.discount_percent = isNaN(v) ? null : Math.max(0, Math.min(100, v))
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  const { error } = await supabaseAdmin.from('products').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}


