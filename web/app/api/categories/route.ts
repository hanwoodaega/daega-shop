import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: products 테이블에서 사용 중인 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // products 테이블에서 고유한 category 값 조회 (deleted 상태 제외)
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .neq('status', 'deleted')
      .not('category', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 고유한 카테고리 목록 추출 및 정렬
    const uniqueCategories = Array.from(new Set(data?.map((item: any) => item.category).filter(Boolean))) as string[]
    const sortedCategories = uniqueCategories.sort()

    return NextResponse.json({ categories: sortedCategories })
  } catch (error: any) {
    console.error('카테고리 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

