import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { enrichProductsServer } from '@/lib/product-queries-server'
import { getTimedealDiscountPercentMap } from '@/lib/timedeal-utils'

// GET: 컬렉션별 상품 목록 조회 (공개 API)
// params.slug는 실제로는 type (best, sale, no9)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sort = searchParams.get('sort') || 'default'
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 컬렉션 정보 조회 (type으로 조회)
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('type', params.slug)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 컬렉션에 속한 상품 조회 (프로모션 정보 포함, deleted 상태 제외)
    let collectionProductsQuery = supabase
      .from('collection_products')
      .select(`
        id,
        priority,
        products!inner (
          id,
          slug,
          brand,
          name,
          price,
          image_url,
          category,
          average_rating,
          review_count,
          weight_gram,
          created_at,
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
        )
      `, { count: 'exact' })
      .eq('collection_id', collection.id)
      .neq('products.status', 'deleted') // deleted 상태 제외

    // 정렬 적용
    if (sort === 'price_asc') {
      collectionProductsQuery = collectionProductsQuery.order('priority', { ascending: true })
    } else if (sort === 'price_desc') {
      collectionProductsQuery = collectionProductsQuery.order('priority', { ascending: true })
    } else {
      collectionProductsQuery = collectionProductsQuery.order('priority', { ascending: true })
    }

    const { data: collectionProducts, error: productsError, count } = await collectionProductsQuery.range(from, to)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // 상품 데이터 추출
    const rawProducts = (collectionProducts || [])
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        return product
      })
      .filter(Boolean)

    // 타임딜 할인율 일괄 조회
    const productIds = rawProducts.map((p: any) => p.id).filter(Boolean)
    const timedealDiscountMap = await getTimedealDiscountPercentMap(productIds)

    // 공통 유틸리티 함수로 상품 데이터 보강
    let products = await enrichProductsServer(rawProducts, timedealDiscountMap)

    // 가격 정렬 (클라이언트 사이드에서 처리 - Supabase의 중첩 정렬 제한)
    if (sort === 'price_asc') {
      products = products.sort((a: any, b: any) => a.price - b.price)
    } else if (sort === 'price_desc') {
      products = products.sort((a: any, b: any) => b.price - a.price)
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      collection,
      products,
      total: count || 0,
      page,
      totalPages,
    })
  } catch (error: any) {
    console.error('컬렉션 상품 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

