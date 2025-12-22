import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getNowUTCISO } from '@/lib/utils/time-utils'

export const dynamic = 'force-dynamic'

// GET: 타임딜 상품 목록 조회 (공개 API)
// 새로운 timedeals 테이블 구조 사용
// revalidateTag를 통해 캐시 무효화 가능
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    // 활성 타임딜 조회
    // DB가 UTC 기준이므로 현재 UTC 시간과 비교
    const now = getNowUTCISO()
    const { data: activeTimedeal, error: timedealError } = await supabase
      .from('timedeals')
      .select('*')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (timedealError) {
      console.error('타임딜 조회 실패:', timedealError)
      return NextResponse.json({ 
        timedeal: null,
        products: [],
        title: '오늘만 특가!'
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }

    if (!activeTimedeal) {
      return NextResponse.json({ 
        timedeal: null,
        products: [],
        title: '오늘만 특가!'
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }

    // 타임딜 상품 조회 (timedeal_products 테이블 사용)
    const { data: timedealProducts, error: productsError } = await supabase
      .from('timedeal_products')
      .select(`
        id,
        discount_percent,
        sort_order,
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
      `)
      .eq('timedeal_id', activeTimedeal.id)
      // .neq() 대신 클라이언트 측에서 필터링 (join된 테이블 필터링 제한)
      .order('sort_order', { ascending: true })
      .limit(limit)

    if (productsError) {
      console.error('타임딜 상품 조회 실패:', productsError)
      // 에러 상세 정보 로깅
      if (productsError.message) {
        console.error('에러 메시지:', productsError.message)
      }
      if (productsError.code) {
        console.error('에러 코드:', productsError.code)
      }
      return NextResponse.json({ 
        error: productsError.message || '상품 조회 실패',
        code: productsError.code 
      }, { status: 400 })
    }

    // 상품 데이터 정리 및 타임딜 할인율 적용 (deleted 상태 제외)
    const rawProducts = (timedealProducts || [])
      .map((tp: any) => {
        const product = Array.isArray(tp.products) ? tp.products[0] : tp.products
        if (!product || product.status === 'deleted') return null
        
        // 타임딜 할인율을 상품 객체에 추가
        return {
          ...product,
          timedeal_discount_percent: tp.discount_percent || 0,
        }
      })
      .filter(Boolean)

    // 타임딜 할인율 맵 생성 (이미 상품에 포함되어 있지만 enrichProductsServer를 위해)
    const timedealDiscountMap = new Map<string, number>()
    rawProducts.forEach((p: any) => {
      if (p.timedeal_discount_percent) {
        timedealDiscountMap.set(p.id, p.timedeal_discount_percent)
      }
    })

    // 공통 유틸리티 함수로 상품 데이터 보강 (프로모션 정보 포함)
    const { enrichProductsServer } = await import('@/lib/product/product-queries-server')
    const products = await enrichProductsServer(rawProducts, timedealDiscountMap)

    return NextResponse.json({
      timedeal: activeTimedeal,
      products,
      title: activeTimedeal.title || '오늘만 특가!',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error: any) {
    console.error('타임딜 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

