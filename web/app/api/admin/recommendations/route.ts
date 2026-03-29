import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 모든 추천 카테고리 조회 (관리자용)
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { data, error } = await supabaseAdmin
      .from('recommendation_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return dbErrorResponse('admin/recommendations GET', error)
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations GET', error)
  }
}

// POST: 추천 카테고리 생성
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, sort_order, is_active } = body

    if (!name) {
      return NextResponse.json({ error: '카테고리 이름이 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('recommendation_categories')
      .insert({
        name,
        sort_order: sort_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/recommendations POST', error)
    }

    return NextResponse.json({ category: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations POST', error)
  }
}

