import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { enrichProductsServer } from '@/lib/product/product-queries-server'
import { getTimedealDiscountPercentMap } from '@/lib/timedeal/timedeal-utils'

export const dynamic = 'force-dynamic'

// GET: 카테고리 상품 조회 (공개 API)
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sort = searchParams.get('sort') || 'default'
    const from = (page - 1) * limit
    const to = from + limit - 1

    // type 필드를 소문자로 정규화
    const normalizedType = params.type.trim().toLowerCase()

    // 카테고리 정보 조회 (활성 상태만)
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('type', normalizedType)
      .eq('is_active', true)
      .single()

    if (categoryError || !category) {
      // 활성 상태와 무관하게 카테고리가 존재하는지 확인
      const { data: allCategory } = await supabase
        .from('categories')
        .select('id, type, is_active, title')
        .eq('type', normalizedType)
        .maybeSingle()
      
      // 소문자로 못 찾으면 원본 type으로도 시도
      let fallbackCategory = allCategory
      if (!allCategory && params.type !== normalizedType) {
        const { data: fallback } = await supabase
          .from('categories')
          .select('id, type, is_active, title')
          .eq('type', params.type)
          .maybeSingle()
        fallbackCategory = fallback || null
      }
      
      if (fallbackCategory) {
        return NextResponse.json({ 
          error: '카테고리가 비활성화되어 있습니다.',
        }, { status: 404 })
      } else {
        return NextResponse.json({ 
          error: '카테고리를 찾을 수 없습니다.',
        }, { status: 404 })
      }
    }

    // 카테고리에 속한 상품 조회 (프로모션 정보 포함, deleted 상태 제외)
    let categoryProductsQuery = supabase
      .from('category_products')
      .select(`
        id,
        priority,
        products!inner (
          id,
          slug,
          brand,
          name,
          price,
          category,
          average_rating,
          review_count,
          weight_gram,
          status,
          created_at,
          promotion_products (
            promotion_id,
            promotions (
              id,
              type,
              buy_qty,
              discount_percent,
              is_active
            )
          )
        )
      `, { count: 'exact' })
      .eq('category_id', category.id)

    // 정렬 적용
    if (sort === 'default') {
      categoryProductsQuery = categoryProductsQuery.order('priority', { ascending: true })
    }

    const { data: categoryProducts, error: productsError, count } = await categoryProductsQuery.range(from, to)

    if (productsError) {
      console.error('카테고리 상품 조회 실패:', productsError)
      return NextResponse.json({ 
        error: productsError.message || '상품 조회 실패',
      }, { status: 400 })
    }

    // 상품 데이터 추출 및 deleted 상태 필터링
    const rawProducts = (categoryProducts || [])
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        return product
      })
      .filter((p: any) => p && p.status !== 'deleted')

    // 타임딜 할인율 일괄 조회
    const productIds = rawProducts.map((p: any) => p.id).filter(Boolean)
    const timedealDiscountMap = await getTimedealDiscountPercentMap(productIds)

    // 공통 유틸리티 함수로 상품 데이터 보강 (이미지, 프로모션, 타임딜 할인율 포함)
    let products = await enrichProductsServer(rawProducts, timedealDiscountMap)

    // 가격 정렬 (클라이언트 사이드에서 처리)
    if (sort === 'price_asc') {
      products = products.sort((a: any, b: any) => a.price - b.price)
    } else if (sort === 'price_desc') {
      products = products.sort((a: any, b: any) => b.price - a.price)
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      category,
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    })
  } catch (error: any) {
    console.error('카테고리 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

