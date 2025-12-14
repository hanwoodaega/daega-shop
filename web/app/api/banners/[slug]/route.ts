import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { enrichProductsServer } from '@/lib/product-queries-server'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString())
    const sort = searchParams.get('sort') || 'default'

    // 배너 조회
    const { data: banner, error: bannerError } = await supabase
      .from('banners')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single()

    if (bannerError || !banner) {
      return NextResponse.json({ error: '배너를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 배너 상품 조회
    const offset = (page - 1) * limit

    // 전체 개수 조회
    const { count } = await supabase
      .from('banner_products')
      .select('*', { count: 'exact', head: true })
      .eq('banner_id', banner.id)

    let query = supabase
      .from('banner_products')
      .select(`
        product_id,
        products (
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
          updated_at,
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
      .eq('banner_id', banner.id)
      // .neq() 대신 클라이언트 측에서 필터링 (join된 테이블 필터링 제한)

    // 정렬: Supabase에서는 join된 테이블 필드로 직접 정렬할 수 없으므로
    // 가격 정렬은 클라이언트에서 처리하고, 기본 정렬만 DB에서 수행
    // 가격 정렬일 때는 DB 정렬을 하지 않음 (클라이언트에서 처리)

    const { data: bannerProducts, error: productsError } = await query
      .range(offset, offset + limit - 1)

    if (productsError) {
      console.error('배너 상품 조회 실패:', productsError)
      return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
    }

    // 상품 데이터 변환 (deleted 상태 제외)
    const rawProducts = (bannerProducts || [])
      .map((bp: any) => {
        const product = Array.isArray(bp.products) ? bp.products[0] : bp.products
        return product
      })
      .filter((p: any) => p && p.id && p.status !== 'deleted')

    // 타임딜 할인율 맵 조회
    const now = new Date().toISOString()
    const { data: activeTimedeal } = await supabase
      .from('timedeals')
      .select('id')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const timedealDiscountMap = new Map<string, number>()
    if (activeTimedeal && rawProducts.length > 0) {
      const productIds = rawProducts.map((p: any) => p.id)
      const { data: timedealProducts } = await supabase
        .from('timedeal_products')
        .select('product_id, discount_percent')
        .eq('timedeal_id', activeTimedeal.id)
        .in('product_id', productIds)

      if (timedealProducts) {
        timedealProducts.forEach((tp: any) => {
          timedealDiscountMap.set(tp.product_id, tp.discount_percent || 0)
        })
      }
    }

    // 상품 데이터 보강
    let products = await enrichProductsServer(rawProducts, timedealDiscountMap)

    // 가격 정렬 (클라이언트 사이드에서 처리 - Supabase의 join 정렬 제한)
    if (sort === 'price_asc') {
      products = products.sort((a: any, b: any) => a.price - b.price)
    } else if (sort === 'price_desc') {
      products = products.sort((a: any, b: any) => b.price - a.price)
    }
    // default 정렬은 이미 DB에서 created_at으로 정렬된 상태이거나 순서 유지

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      banner,
      products,
      page,
      totalPages,
      total: totalCount,
      hasMore: page < totalPages,
    })
  } catch (error: any) {
    console.error('배너 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

