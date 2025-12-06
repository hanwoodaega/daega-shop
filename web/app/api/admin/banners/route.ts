import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 배너 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ banners: data || [] })
  } catch (error: any) {
    console.error('배너 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 배너 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title_black, title_red, description, image_url, background_color, is_active, sort_order, slug } = body

    if (!image_url) {
      return NextResponse.json({ error: 'image_url은 필수입니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({
        title_black: title_black || null,
        title_red: title_red || null,
        description: description || null,
        image_url,
        background_color: background_color || '#FFFFFF',
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0,
        slug: slug || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ banner: data })
  } catch (error: any) {
    console.error('배너 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

