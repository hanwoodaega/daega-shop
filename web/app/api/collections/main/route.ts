import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getKSTNow } from '@/lib/time-utils'

export const dynamic = 'force-dynamic'

// GET: 메인페이지용 활성 컬렉션 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const now = getKSTNow()

    // 컬렉션 조회 (날짜 범위 체크)
    const { data: collections, error } = await supabase
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 날짜 범위 필터링
    const activeCollections = (collections || []).filter((collection) => {
      // start_at이 있고 현재 시간보다 미래면 제외
      if (collection.start_at) {
        const startAt = new Date(collection.start_at)
        if (startAt > now) return false
      }
      
      // end_at이 있고 현재 시간보다 과거면 제외
      if (collection.end_at) {
        const endAt = new Date(collection.end_at)
        if (endAt < now) return false
      }
      
      return true
    })

    return NextResponse.json({ collections: activeCollections })
  } catch (error: any) {
    console.error('메인페이지 컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

