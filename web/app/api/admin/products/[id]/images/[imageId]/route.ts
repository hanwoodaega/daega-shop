import { NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

// DELETE: 상품 이미지 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string } }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id, imageId } = 'then' in params ? await params : params
    
    const { error } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', id)

    if (error) {
      return dbErrorResponse('admin product_images DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return unknownErrorResponse('admin product_images DELETE', e)
  }
}

// PATCH: 상품 이미지 우선순위 변경
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string } }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id, imageId } = 'then' in params ? await params : params
    const body = await request.json()
    const { priority } = body

    if (priority === undefined || priority === null) {
      return NextResponse.json({ error: 'priority is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('product_images')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', imageId)
      .eq('product_id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin product_images PATCH', error)
    }

    return NextResponse.json({ image: data })
  } catch (e: unknown) {
    return unknownErrorResponse('admin product_images PATCH', e)
  }
}

