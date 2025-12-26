import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { PRODUCT_SELECT_FIELDS, enrichProductsServer } from '@/lib/product/product.service'

// 동적 라우트로 처리 (cookies 사용)
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const supabase = createSupabaseServerClient()

    // 추천 상품 조회
    const { data: recommendationProducts, error: recommendationError } = await supabase
      .from('recommendation_products')
      .select(`
        id,
        sort_order,
        products (${PRODUCT_SELECT_FIELDS})
      `)
      .eq('recommendation_category_id', categoryId)
      .order('sort_order', { ascending: true })

    if (recommendationError) {
      console.error('추천 상품 조회 실패:', recommendationError)
      return NextResponse.json({ error: '추천 상품 조회 실패' }, { status: 500 })
    }

    // 상품 데이터 추출 및 보강
    const products = (recommendationProducts || [])
      .map((rp: any) => rp.products)
      .filter((p: any) => p && p.status !== 'deleted')

    const enrichedProducts = await enrichProductsServer(products)

    return NextResponse.json({ products: enrichedProducts })
  } catch (error) {
    console.error('추천 상품 조회 중 서버 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

