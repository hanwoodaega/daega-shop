import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin()
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  let body: { sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.sort_order !== 'number') {
    return NextResponse.json({ error: 'sort_order (number) required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('product_description_images')
    .update({ sort_order: body.sort_order })
    .eq('id', id)
    .select('id, product_id, image_url, sort_order, created_at')
    .single()

  if (error) {
    console.error('[product-description-images] PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ image: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertAdmin()
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { data: row, error: fetchError } = await supabaseAdmin
    .from('product_description_images')
    .select('image_url')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('product_description_images')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[product-description-images] DELETE error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const url = row.image_url as string
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (match?.[1]) {
    await supabaseAdmin.storage.from('product-descriptions').remove([match[1]])
  }

  return NextResponse.json({ ok: true })
}
