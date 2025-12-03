import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { extractActivePromotion } from '@/lib/product-queries'

export const dynamic = 'force-dynamic'

// GET: 타임딜 컬렉션 상품 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    // 타임딜 컬렉션 조회
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('type', 'timedeal')
      .maybeSingle()

    if (collectionError || !collection) {
      return NextResponse.json({ 
        collection: null,
        products: [],
        title: '오늘만 특가!'
      })
    }

    // 종료 시간 체크
    const now = new Date()
    if (collection.end_at && new Date(collection.end_at) <= now) {
      // 종료 시간이 지났으면 컬렉션 삭제 (또는 end_at만 null로)
      await supabase
        .from('collections')
        .update({ end_at: null })
        .eq('id', collection.id)
      
      return NextResponse.json({ 
        collection: null,
        products: [],
        title: collection.title || '오늘만 특가!'
      })
    }

    // 타임딜 컬렉션의 상품 조회 (프로모션 정보 포함, deleted 상태 제외)
    const { data: collectionProducts, error: productsError } = await supabase
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
      `)
      .eq('collection_id', collection.id)
      .neq('products.status', 'deleted') // deleted 상태 제외
      .order('priority', { ascending: true })
      .limit(limit)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // 상품 데이터 정리 및 프로모션 정보 처리
    const products = (collectionProducts || []).map((cp: any) => {
      const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
      if (!product) return null

      // 활성화된 프로모션 찾기
      let activePromotion = null
      if (product.promotion_products && product.promotion_products.length > 0) {
        const now = new Date()
        for (const pp of product.promotion_products) {
          const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
          if (promo && promo.is_active) {
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
        promotion: activePromotion,
      }
    }).filter(Boolean)

    return NextResponse.json({
      collection,
      products,
      title: collection.title || '오늘만 특가!',
    })
  } catch (error: any) {
    console.error('타임딜 컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

