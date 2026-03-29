import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

// GET: products 테이블에서 사용 중인 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // products 테이블에서 고유한 category 값 조회 (deleted 상태 제외)
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .neq('status', 'deleted')
      .not('category', 'is', null)

    if (error) {
      return dbErrorResponse('categories GET', error)
    }

    // 고유한 카테고리 목록 추출 및 정렬
    const uniqueCategories = Array.from(new Set(data?.map((item: any) => item.category).filter(Boolean))) as string[]
    const sortedCategories = uniqueCategories.sort()

    return NextResponse.json({ categories: sortedCategories })
  } catch (error: unknown) {
    return unknownErrorResponse('categories GET', error)
  }
}

