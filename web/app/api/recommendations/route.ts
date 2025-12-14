import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// 동적 라우트로 처리 (cookies 사용)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    // 활성화된 추천 카테고리 조회
    const { data: categories, error: categoriesError } = await supabase
      .from('recommendation_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('추천 카테고리 조회 실패:', categoriesError)
      return NextResponse.json({ error: '추천 카테고리 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error('추천 카테고리 조회 중 서버 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

