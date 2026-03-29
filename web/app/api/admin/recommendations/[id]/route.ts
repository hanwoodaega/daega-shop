import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 특정 추천 카테고리 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('recommendation_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return dbErrorResponse('admin/recommendations/[id] GET', error)
    }

    return NextResponse.json({ category: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id] GET', error)
  }
}

// PUT: 추천 카테고리 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { name, sort_order, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('recommendation_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/recommendations/[id] PUT', error)
    }

    return NextResponse.json({ category: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id] PUT', error)
  }
}

// DELETE: 추천 카테고리 소프트 삭제 (is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { error } = await supabaseAdmin
      .from('recommendation_categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return dbErrorResponse('admin/recommendations/[id] DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id] DELETE', error)
  }
}

