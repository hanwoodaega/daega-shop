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
    const { searchParams } = new URL(request.url)
    const is_active = searchParams.get('is_active')

    let query = supabaseAdmin
      .from('collections')
      .select('*')
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
    const { type, title, start_at, end_at } = body

    if (!type || !['timedeal', 'best', 'sale', 'no9'].includes(type)) {
      return NextResponse.json({ error: 'type은 필수이며 timedeal, best, sale, no9 중 하나여야 합니다.' }, { status: 400 })
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
    if (start_at !== undefined) insertData.start_at = start_at || null
    if (end_at !== undefined) insertData.end_at = end_at || null

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

