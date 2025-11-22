import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { assertAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET: 타임딜 설정 조회 (제목, 시작/종료 시간)
// collections 테이블에서 조회 (flash_sale_settings는 더 이상 사용하지 않음)
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    // collections 테이블에서 타임딜 컬렉션 조회
    const { data, error } = await supabase
      .from('collections')
      .select('title, start_at, end_at')
      .eq('type', 'timedeal')
      .maybeSingle()

    if (error) {
      console.error('타임딜 설정 조회 실패:', error)
    }

    return NextResponse.json({ 
      title: data?.title || '오늘만 특가!',
      start_time: data?.start_at || null,
      end_time: data?.end_at || null
    })
  } catch (error) {
    console.error('타임딜 설정 조회 에러:', error)
    return NextResponse.json({ 
      title: '오늘만 특가!',
      start_time: null,
      end_time: null
    })
  }
}

// PUT: 타임딜 설정 수정 (제목, 시작/종료 시간)
// collections 테이블에 저장 (flash_sale_settings는 더 이상 사용하지 않음)
export async function PUT(request: Request) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    const body = await request.json()
    const { title, start_time, end_time } = body

    // 타임딜 컬렉션 조회 또는 생성
    const { data: existingCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('type', 'timedeal')
      .maybeSingle()

    const updates: any = {
      updated_at: new Date().toISOString(),
    }
    
    if (title !== undefined) {
      if (typeof title !== 'string') {
        return NextResponse.json({ error: '제목은 문자열이어야 합니다.' }, { status: 400 })
      }
      updates.title = title || null
    }

    if (start_time !== undefined) {
      updates.start_at = start_time || null
    }

    if (end_time !== undefined) {
      if (!end_time) {
        return NextResponse.json({ error: '종료 시간은 필수입니다.' }, { status: 400 })
      }
      updates.end_at = end_time
      // 종료 시간이 지났으면 비활성화
      if (end_time && new Date(end_time) <= new Date()) {
        updates.is_active = false
      } else {
        updates.is_active = true
      }
    }

    if (existingCollection) {
      // 기존 컬렉션 업데이트
      const { error: updateError } = await supabase
        .from('collections')
        .update(updates)
        .eq('id', existingCollection.id)

      if (updateError) {
        console.error('타임딜 설정 저장 실패:', updateError)
        return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 })
      }
    } else {
      // 새 컬렉션 생성
      const { error: insertError } = await supabase
        .from('collections')
        .insert({
          type: 'timedeal',
          ...updates,
        })

      if (insertError) {
        console.error('타임딜 설정 저장 실패:', insertError)
        return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: '타임딜 설정이 수정되었습니다.',
      title: updates.title,
      start_time: updates.start_at,
      end_time: updates.end_at
    })
  } catch (error) {
    console.error('타임딜 설정 수정 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

