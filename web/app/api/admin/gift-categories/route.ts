import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 선물 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    let query = supabaseAdmin
      .from('gift_categories')
      .select('*')
      .order('priority', { ascending: true })

    if (slug) {
      query = query.eq('slug', slug)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error: any) {
    console.error('선물 카테고리 조회 실패:', error)
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// POST: 선물 카테고리 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug, priority } = body

    if (!name || !slug) {
      return NextResponse.json({ error: '이름과 슬러그는 필수입니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('gift_categories')
      .insert({
        name,
        slug,
        priority: priority || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('선물 카테고리 생성 실패:', error)
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

