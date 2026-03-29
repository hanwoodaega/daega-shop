import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// PUT: 히어로 슬라이드 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { image_url, link_url, sort_order, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (image_url !== undefined) updateData.image_url = image_url
    if (link_url !== undefined) updateData.link_url = link_url || null
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('hero_slides')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/hero/[id] PUT', error)
    }

    return NextResponse.json({ slide: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/hero/[id] PUT', error)
  }
}

// DELETE: 히어로 슬라이드 소프트 삭제 (is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { error } = await supabaseAdmin
      .from('hero_slides')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return dbErrorResponse('admin/hero/[id] DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/hero/[id] DELETE', error)
  }
}

