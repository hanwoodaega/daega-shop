import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 히어로 슬라이드 목록 조회
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminApi(request)
  if (unauthorized) return unauthorized

  try {
    const { data, error } = await supabaseAdmin
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return dbErrorResponse('admin/hero GET', error)
    }

    return NextResponse.json({ slides: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/hero GET', error)
  }
}

// POST: 히어로 슬라이드 생성
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { image_url, link_url, sort_order, is_active } = body

    if (!image_url) {
      return NextResponse.json({ error: '이미지 URL은 필수입니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('hero_slides')
      .insert({
        image_url,
        link_url: link_url || null,
        sort_order: sort_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/hero POST', error)
    }

    revalidateTag('hero', 'default')
    revalidatePath('/')

    return NextResponse.json({ slide: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/hero POST', error)
  }
}

