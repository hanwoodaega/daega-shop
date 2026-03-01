import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { PRODUCT_SELECT_FIELDS, enrichProductsServer } from '@/lib/product/product.service'

// 동적 라우트로 설정 (searchParams 사용)
export const dynamic = 'force-dynamic'

// GET: 상품 목록 조회 (리뷰 통계 포함)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sort = searchParams.get('sort') || 'default'
    const category = searchParams.get('category')
    const filter = searchParams.get('filter') // best, sale
    const searchQuery = searchParams.get('search')
    
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = createSupabaseServerClient()

    // filter=promotion일 때는 활성화된 프로모션의 상품만 조회
    let promotionProductIds: string[] = []
    if (filter === 'promotion') {
      // 활성화된 프로모션 ID 조회
      const { data: activePromotions, error: promoError } = await supabase
        .from('promotions')
        .select('id')
        .eq('is_active', true)
      
      if (promoError) {
        console.error('프로모션 조회 실패:', promoError)
      } else if (activePromotions && activePromotions.length > 0) {
        const promotionIds = activePromotions.map((p: any) => p.id)
        
        // 활성화된 프로모션에 연결된 상품 ID 조회
        const { data: promotionProducts, error: ppError } = await supabase
          .from('promotion_products')
          .select('product_id')
          .in('promotion_id', promotionIds)
        
        if (ppError) {
          console.error('프로모션 상품 조회 실패:', ppError)
        } else {
          promotionProductIds = Array.from(new Set(promotionProducts?.map((pp: any) => pp.product_id) || []))
        }
      }
    }

    // 상품 조회 쿼리 구성 (프로모션 정보 포함)
    const selectFields = PRODUCT_SELECT_FIELDS
    
    let query = supabase
      .from('products')
      .select(selectFields, { count: 'exact' })
      .neq('status', 'deleted') // deleted 상태 제외
      
    // filter=promotion일 때는 promotion_products에 있는 상품만 필터링
    if (filter === 'promotion') {
      if (promotionProductIds.length > 0) {
        query = query.in('id', promotionProductIds)
      } else {
        // 프로모션 상품이 없으면 빈 결과 반환
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
    
    query = query.range(from, to)

    // 검색어 필터
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`
      )
    } else if (filter) {
      // 필터 적용 (flash-sale 제거됨 - 타임딜 미사용)
      if (filter === 'flash-sale') {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
      // filter=promotion일 때는 inner join으로 이미 필터링됨
    } else if (category && category !== '전체') {
      // 카테고리 필터
      query = query.eq('category', category)
    }

    // 정렬 적용
    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: products, error, count } = await query

    if (error) {
      console.error('[API/products] 상품 조회 실패:', error)
      console.error('[API/products] 에러 코드:', error.code)
      console.error('[API/products] 에러 메시지:', error.message)
      console.error('[API/products] 에러 상세:', error.details)
      console.error('[API/products] 쿼리 파라미터:', { page, limit, sort, category, filter, searchQuery })
      return NextResponse.json({ 
        error: error.message || '상품 조회 실패',
        code: error.code 
      }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        products: [],
        total: count || 0,
        page,
        totalPages: 0,
      })
    }

    // 공통 유틸리티 함수로 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer(products, {
      filter: filter || undefined
    })

    const totalPages = Math.ceil((count || 0) / limit)

    const response = NextResponse.json({
      products: enrichedProducts,
      total: count || 0,
      page,
      totalPages,
    })

    // 캐싱 헤더 추가 (10초간 캐시)
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('상품 목록 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

