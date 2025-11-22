import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
    const filter = searchParams.get('filter') // best, sale, flash-sale
    const searchQuery = searchParams.get('search')
    
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = createSupabaseServerClient()

    // 상품 조회 쿼리 구성 (프로모션 정보 포함)
    const selectFields = `
      id,
      slug,
      brand,
      name,
      price,
      image_url,
      category,
      average_rating,
      review_count,
      created_at,
      updated_at,
      promotion_products (
        promotion_id,
        promotions (
          id,
          type,
          buy_qty,
          discount_percent,
          is_active,
          start_at,
          end_at
        )
      )
    `
    
    let query = supabase
      .from('products')
      .select(selectFields, { count: 'exact' })
      .range(from, to)

    // 검색어 필터
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`
      )
    } else if (filter) {
      // 필터 적용
      if (filter === 'flash-sale') {
        // 타임딜 상품 필터: collections 테이블의 'timedeal' 컬렉션에서 상품 ID 조회
        const { data: timedealCollection } = await supabase
          .from('collections')
          .select('id')
          .eq('type', 'timedeal')
          .maybeSingle()
        
        if (timedealCollection) {
          const { data: collectionProducts } = await supabase
            .from('collection_products')
            .select('product_id')
            .eq('collection_id', timedealCollection.id)
          
          const timedealProductIds = collectionProducts?.map((cp: any) => cp.product_id) || []
          if (timedealProductIds.length > 0) {
            query = query.in('id', timedealProductIds)
          } else {
            // 타임딜 상품이 없으면 빈 결과 반환
            query = query.eq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 ID로 필터링
          }
        } else {
          // 타임딜 컬렉션이 없으면 빈 결과 반환
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 ID로 필터링
        }
      }
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

    // 프로모션 정보 처리 및 상품 데이터 정리
    const enrichedProducts = products.map((product: any) => {
      // 활성화된 프로모션 찾기
      let activePromotion = null
      if (product.promotion_products && product.promotion_products.length > 0) {
        const now = new Date()
        for (const pp of product.promotion_products) {
          const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
          if (promo && promo.is_active) {
            // 날짜 체크
            const startAt = promo.start_at ? new Date(promo.start_at) : null
            const endAt = promo.end_at ? new Date(promo.end_at) : null
            const isInDateRange = (!startAt || now >= startAt) && (!endAt || now <= endAt)
            
            if (isInDateRange) {
              activePromotion = promo
              break
            }
          }
        }
      }

      return {
        ...product,
        average_rating: product.average_rating || 0,
        review_count: product.review_count || 0,
        promotion: activePromotion,
      }
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

