import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getKSTNow } from '@/lib/time-utils'

export const dynamic = 'force-dynamic'

// GET: 메인페이지용 활성 컬렉션 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // 활성 컬렉션만 조회
    const { data: collections, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ collections: collections || [] })
  } catch (error: any) {
    console.error('메인페이지 컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

