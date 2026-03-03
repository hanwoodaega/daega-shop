import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { enrichProductsServer } from '@/lib/product/product.service'

// GET: 컬렉션별 상품 목록 조회 (공개 API)
// slug는 실제로는 type (best, sale, no9)
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sort = searchParams.get('sort') || 'default'
    const from = (page - 1) * limit
    const to = from + limit - 1

    // type 필드를 소문자로 정규화 (DB 저장 시 소문자로 저장되도록 했으므로)
    const normalizedType = slug.trim().toLowerCase()

    // 컬렉션 정보 조회 (type으로 조회, 활성 상태만)
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('type', normalizedType)
      .eq('is_active', true)
      .single()

    if (collectionError || !collection) {
      // 활성 상태와 무관하게 컬렉션이 존재하는지 확인
      const { data: allCollection } = await supabase
        .from('collections')
        .select('id, type, is_active, title')
        .eq('type', normalizedType)
        .maybeSingle()
      
      // 소문자로 못 찾으면 원본 slug로도 시도 (기존 데이터 호환성)
      let fallbackCollection = allCollection
      if (!allCollection && slug !== normalizedType) {
        const { data: fallback } = await supabase
          .from('collections')
          .select('id, type, is_active, title')
          .eq('type', slug)
          .maybeSingle()
        fallbackCollection = fallback || null
      }
      
      if (fallbackCollection) {
        return NextResponse.json({ 
          error: '컬렉션이 비활성화되어 있습니다.',
        }, { status: 404 })
      } else {
        return NextResponse.json({ 
          error: '컬렉션을 찾을 수 없습니다.',
        }, { status: 404 })
      }
    }

    // 컬렉션에 속한 상품 조회 (프로모션 정보 포함, deleted 상태 제외)
    // 주의: Supabase에서 join된 테이블 필드 필터링 시 .neq() 대신 다른 방식 사용
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
      .eq('collection_id', collection.id)
      // .neq() 대신 클라이언트 측에서 필터링 (join된 테이블 필터링 제한)

    // 정렬 적용
    // 가격 정렬일 때는 priority 정렬을 하지 않음 (클라이언트에서 가격 정렬)
    // default일 때만 priority 정렬
    if (sort === 'default') {
      // default 정렬: priority가 낮은 순서대로, 같으면 먼저 만든 순서
      collectionProductsQuery = collectionProductsQuery
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
    }
    // price_asc, price_desc는 DB에서 정렬하지 않음 (클라이언트에서 처리)

    const { data: collectionProducts, error: productsError, count } = await collectionProductsQuery.range(from, to)

    if (productsError) {
      console.error('컬렉션 상품 조회 실패:', productsError)
      return NextResponse.json({ 
        error: productsError.message || '상품 조회 실패',
      }, { status: 400 })
    }

    // 상품 데이터 추출 및 deleted 상태 필터링 (서버 측에서 필터링)
    const rawProducts = (collectionProducts || [])
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        return product
      })
      .filter((p: any) => p && p.status !== 'deleted') // deleted 상태 제외

    // 공통 유틸리티 함수로 상품 데이터 보강
    let products = await enrichProductsServer(rawProducts)

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

