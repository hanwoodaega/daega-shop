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
    const filter = searchParams.get('filter') // new, best, sale, budget
    const searchQuery = searchParams.get('search')
    
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = createSupabaseServerClient()

    // 상품 조회 쿼리 구성
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(from, to)

    // 검색어 필터
    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,origin.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`
      )
    } else if (filter) {
      // 필터 적용
      if (filter === 'new') {
        query = query.eq('is_new', true)
      } else if (filter === 'best') {
        query = query.eq('is_best', true)
      } else if (filter === 'sale') {
        query = query.eq('is_sale', true)
      } else if (filter === 'budget') {
        query = query.eq('is_budget', true)
      }
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

    // 모든 상품 ID 수집
    const productIds = products.map((p: any) => p.id)

    // 리뷰 통계를 한 번에 조회 (승인된 리뷰 기준)
    let reviewStats: Record<string, { count: number; average: number }> = {}
    
    try {
      // 승인된 리뷰만 조회 시도
      const reviewsRes = await supabase
        .from('reviews')
        .select('product_id, rating, status')
        .in('product_id', productIds)
        .eq('status', 'approved')

      if (reviewsRes.data) {
        // 상품별로 그룹화하여 통계 계산
        const statsMap = new Map<string, { sum: number; count: number }>()
        
        reviewsRes.data.forEach((review: any) => {
          const productId = review.product_id
          const current = statsMap.get(productId) || { sum: 0, count: 0 }
          statsMap.set(productId, {
            sum: current.sum + (review.rating || 0),
            count: current.count + 1,
          })
        })

        // 평균 계산
        statsMap.forEach((value, productId) => {
          reviewStats[productId] = {
            count: value.count,
            average: value.count > 0 ? Number((value.sum / value.count).toFixed(2)) : 0,
          }
        })
      }
    } catch (reviewError: any) {
      // status 컬럼이 없거나 오류 시 폴백: 전체 리뷰로 계산
      try {
        const reviewsRes = await supabase
          .from('reviews')
          .select('product_id, rating')
          .in('product_id', productIds)

        if (reviewsRes.data) {
          const statsMap = new Map<string, { sum: number; count: number }>()
          
          reviewsRes.data.forEach((review: any) => {
            const productId = review.product_id
            const current = statsMap.get(productId) || { sum: 0, count: 0 }
            statsMap.set(productId, {
              sum: current.sum + (review.rating || 0),
              count: current.count + 1,
            })
          })

          statsMap.forEach((value, productId) => {
            reviewStats[productId] = {
              count: value.count,
              average: value.count > 0 ? Number((value.sum / value.count).toFixed(2)) : 0,
            }
          })
        }
      } catch (fallbackError) {
        console.error('리뷰 통계 조회 실패:', fallbackError)
        // 리뷰 통계가 없어도 상품 목록은 반환
      }
    }

    // 상품에 리뷰 통계 추가
    const enrichedProducts = products.map((product: any) => {
      const stats = reviewStats[product.id] || { count: 0, average: 0 }
      return {
        ...product,
        average_rating: stats.average || product.average_rating || 0,
        review_count: stats.count || product.review_count || 0,
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

