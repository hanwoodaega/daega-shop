import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { enrichProductsServer } from '@/lib/product-queries-server'
import { PRODUCT_SELECT_FIELDS } from '@/lib/product-queries'

// 동적 라우트로 처리 (cookies 사용)
export const dynamic = 'force-dynamic'

// GET: 실시간 인기 선물세트 상품 조회
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // 실시간 인기 카테고리 조회
    const { data: categoryData, error: categoryError } = await supabase
      .from('gift_categories')
      .select('id')
      .eq('slug', 'featured')
      .single()

    if (categoryError || !categoryData) {
      return NextResponse.json({ products: [] })
    }

    // 상품 조회
    const { data: productsData, error: productsError } = await supabase
      .from('gift_category_products')
      .select(`
        priority,
        products (
          ${PRODUCT_SELECT_FIELDS}
        )
      `)
      .eq('gift_category_id', categoryData.id)
      .neq('products.status', 'deleted')
      .order('priority', { ascending: true })

    if (productsError) {
      console.error('선물세트 상품 조회 실패:', productsError)
      return NextResponse.json({ products: [] })
    }

    // 상품 데이터 변환
    const featured = (productsData || [])
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        if (!product) return null

        return {
          ...product,
          gift_featured_order: cp.priority,
        }
      })
      .filter((p: any) => p && p.id) // null 제거
      .sort((a: any, b: any) => {
        const orderA = a.gift_featured_order ?? 999999
        const orderB = b.gift_featured_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    
    const result = featured.slice(0, 20)
    
    // 서버 사이드에서 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer(result)
    
    return NextResponse.json({ products: enrichedProducts })
  } catch (error: any) {
    console.error('선물세트 상품 조회 실패:', error)
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}

