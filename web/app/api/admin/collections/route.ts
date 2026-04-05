import { NextRequest, NextResponse } from 'next/server'
import { revalidateCollectionsPublicCache } from '@/lib/cache/revalidate-collections-public'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 컬렉션 목록 조회
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { data, error } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      return dbErrorResponse('admin/collections GET', error)
    }

    return NextResponse.json({ collections: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections GET', error)
  }
}

// POST: 컬렉션 생성
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { title, description, image_url, color_theme, sort_order, is_active } = body

    // type 필드 검증 및 정규화 (trim + lowercase)
    if (!body.type) {
      return NextResponse.json({ error: 'type은 필수입니다.' }, { status: 400 })
    }

    const type = String(body.type).trim().toLowerCase()

    if (!type) {
      return NextResponse.json({ error: 'type은 비어있을 수 없습니다.' }, { status: 400 })
    }

    // 공개 URL /collections/{type} 에 쓰이므로 URL 안전한 slug만 허용
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(type)) {
      return NextResponse.json(
        {
          error:
            '타입은 영문 소문자, 숫자, 하이픈(-), 밑줄(_)만 사용하세요. 맨 앞은 숫자일 수 없습니다. (공백·한글·특수문자 불가)',
        },
        { status: 400 }
      )
    }

    // 같은 type이 이미 존재하는지 확인
    const { data: existing } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('type', type)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 타입입니다.' }, { status: 400 })
    }

    // color_theme 검증 (객체여야 함, description_color는 사용하지 않음)
    if (color_theme !== undefined && color_theme !== null) {
      if (typeof color_theme !== 'object' || Array.isArray(color_theme)) {
        return NextResponse.json({ error: 'color_theme은 객체여야 합니다.' }, { status: 400 })
      }
      if (!color_theme.background) {
        return NextResponse.json({ error: 'color_theme.background가 필요합니다.' }, { status: 400 })
      }
    }

    const insertData: any = {
      type,
    }

    if (title !== undefined) insertData.title = title || null
    if (description !== undefined) insertData.description = description || null
    if (image_url !== undefined) insertData.image_url = image_url || null
    if (color_theme !== undefined) {
      insertData.color_theme = { background: color_theme.background }
    }
    if (sort_order !== undefined) {
      const n = Number(sort_order)
      insertData.sort_order = Number.isFinite(n) ? Math.trunc(n) : 0
    }
    if (is_active !== undefined) insertData.is_active = is_active ?? true

    const { data, error } = await supabaseAdmin
      .from('collections')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/collections POST', error)
    }

    revalidateCollectionsPublicCache()

    return NextResponse.json({ collection: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections POST', error)
  }
}

