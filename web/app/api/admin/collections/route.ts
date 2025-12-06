import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 컬렉션 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let query = supabaseAdmin
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ collections: data || [] })
  } catch (error: any) {
    console.error('컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 컬렉션 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, title, description, image_url, color_theme, sort_order, is_active } = body

    if (!type) {
      return NextResponse.json({ error: 'type은 필수입니다.' }, { status: 400 })
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

    const insertData: any = {
      type,
    }

    if (title !== undefined) insertData.title = title || null
    if (description !== undefined) insertData.description = description || null
    if (image_url !== undefined) insertData.image_url = image_url || null
    if (color_theme !== undefined) insertData.color_theme = color_theme || null
    if (sort_order !== undefined) insertData.sort_order = sort_order ?? 0
    if (is_active !== undefined) insertData.is_active = is_active ?? true

    const { data, error } = await supabaseAdmin
      .from('collections')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ collection: data })
  } catch (error: any) {
    console.error('컬렉션 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

