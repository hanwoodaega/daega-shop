import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { assertAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET: 타임딜 제목 조회
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    // flash_sale_settings 테이블에서 제목 조회
    // 없으면 기본값 반환
    const { data, error } = await supabase
      .from('flash_sale_settings')
      .select('title')
      .eq('id', 1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러이므로 무시
      console.error('타임딜 설정 조회 실패:', error)
    }

    return NextResponse.json({ 
      title: data?.title || '오늘만 특가!'
    })
  } catch (error) {
    console.error('타임딜 설정 조회 에러:', error)
    return NextResponse.json({ 
      title: '오늘만 특가!'
    })
  }
}

// PUT: 타임딜 제목 수정
export async function PUT(request: Request) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    const { title } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: '제목이 필요합니다.' }, { status: 400 })
    }

    // upsert로 설정 저장 (id=1인 레코드가 없으면 생성, 있으면 업데이트)
    const { error: upsertError } = await supabase
      .from('flash_sale_settings')
      .upsert({ id: 1, title: title }, { onConflict: 'id' })

    if (upsertError) {
      console.error('타임딜 설정 저장 실패:', upsertError)
      return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '타임딜 제목이 수정되었습니다.',
      title: title
    })
  } catch (error) {
    console.error('타임딜 설정 수정 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

