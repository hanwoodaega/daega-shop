import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PRODUCT_SELECT_FIELDS } from '@/lib/product-queries'
import { enrichProductsServer } from '@/lib/product-queries-server'
import { getTimedealDiscountPercentMap } from '@/lib/timedeal-utils'

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

    // filter=promotion일 때는 promotion_products 테이블에서 product_id를 먼저 조회
    let promotionProductIds: string[] = []
    if (filter === 'promotion') {
      const { data: promotionProducts, error: ppError } = await supabase
        .from('promotion_products')
        .select('product_id')
      
      if (ppError) {
        console.error('프로모션 상품 조회 실패:', ppError)
      } else {
        promotionProductIds = Array.from(new Set(promotionProducts?.map((pp: any) => pp.product_id) || []))
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
      // 필터 적용
      if (filter === 'flash-sale') {
        // 타임딜 상품 필터: timedeals 테이블에서 활성 타임딜 조회 후 상품 ID 조회
        const now = new Date().toISOString()
        const { data: activeTimedeal } = await supabase
          .from('timedeals')
          .select('id')
          .lte('start_at', now)
          .gte('end_at', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (activeTimedeal) {
          const { data: timedealProducts } = await supabase
            .from('timedeal_products')
            .select('product_id')
            .eq('timedeal_id', activeTimedeal.id)
          
          const timedealProductIds = timedealProducts?.map((tp: any) => tp.product_id) || []
          if (timedealProductIds.length > 0) {
            query = query.in('id', timedealProductIds)
          } else {
            // 타임딜 상품이 없으면 빈 결과 반환
            query = query.eq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 ID로 필터링
          }
        } else {
          // 활성 타임딜이 없으면 빈 결과 반환
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 ID로 필터링
        }
      }
      // filter=promotion일 때는 inner join으로 이미 필터링됨
    } else if (category && category !== '전체') {
      // 카테고리 필터
      query = query.eq('category', category)
    }

    // 정렬 적용
    if (filter === 'flash-sale') {
      // 타임딜은 가격 순으로 정렬
      query = query.order('price', { ascending: true })
    } else if (sort === 'price_asc') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: products, error, count } = await query

    if (error) {
      console.error('상품 조회 실패:', error)
      return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        products: [],
        total: count || 0,
        page,
        totalPages: 0,
      })
    }

    // 타임딜 할인율 일괄 조회
    const productIds = products.map((p: any) => p.id)
    const timedealDiscountMap = await getTimedealDiscountPercentMap(productIds)

    // 공통 유틸리티 함수로 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer(products, timedealDiscountMap, { 
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

