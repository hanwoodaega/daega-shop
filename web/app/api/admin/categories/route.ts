import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('type', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error: any) {
    console.error('카테고리 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 카테고리 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, title, description, is_active } = body

    // type 필드 검증 및 정규화
    if (!type) {
      return NextResponse.json({ error: 'type은 필수입니다.' }, { status: 400 })
    }

    const normalizedType = String(type).trim().toLowerCase()

    if (!normalizedType) {
      return NextResponse.json({ error: 'type은 비어있을 수 없습니다.' }, { status: 400 })
    }

    // 허용된 타입만 사용 가능 (각 타입은 고유한 페이지와 UI를 가짐)
    const allowedTypes = ['best', 'sale', 'no9']
    if (!allowedTypes.includes(normalizedType)) {
      return NextResponse.json({ 
        error: `type은 'best', 'sale', 'no9' 중 하나여야 합니다. 각 타입은 고유한 페이지(/best, /sale, /no9)와 UI를 가지고 있습니다.` 
      }, { status: 400 })
    }

    // 같은 type이 이미 존재하는지 확인
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('type', normalizedType)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 타입입니다.' }, { status: 400 })
    }

    const insertData: any = {
      type: normalizedType,
      title: title || null,
      description: description || null,
      is_active: is_active ?? true,
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('카테고리 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

