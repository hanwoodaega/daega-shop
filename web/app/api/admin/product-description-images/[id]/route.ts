import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse } from '@/lib/api/api-errors'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
    return dbErrorResponse('admin product_description_images PATCH', error)
  }

  return NextResponse.json({ image: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
    return dbErrorResponse('admin product_description_images DELETE', deleteError)
  }

  // image_url에서 storage 경로 추출
  if (row.image_url) {
    const url = row.image_url as string
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
    if (match?.[1]) {
      await supabaseAdmin.storage.from('product-descriptions').remove([match[1]])
    }
  }

  return NextResponse.json({ ok: true })
}
