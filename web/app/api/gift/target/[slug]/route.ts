import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { enrichProductsServer, PRODUCT_SELECT_FIELDS } from '@/lib/product/product.service'

// 동적 라우트로 처리 (cookies 사용)
export const dynamic = 'force-dynamic'

// GET: 대상별 선물세트 상품 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const { slug } = await params
    const supabase = await createSupabaseServerClient()
    
    // 카테고리 조회
    const { data: categoryData, error: categoryError } = await supabase
      .from('gift_categories')
      .select('id')
      .eq('slug', slug)
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
      // .neq() 대신 클라이언트 측에서 필터링 (join된 테이블 필터링 제한)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (productsError) {
      console.error('선물 대상 상품 조회 실패:', productsError)
      return NextResponse.json({ products: [] })
    }
    
    // 상품 데이터 변환 (deleted 상태 제외)
    const filtered = (productsData || [])
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        if (!product || product.status === 'deleted') return null

        return {
          ...product,
          gift_display_order: cp.priority,
        }
      })
      .filter((p: any) => p && p.id) // null 제거
      .sort((a: any, b: any) => {
        const orderA = a.gift_display_order ?? 999999
        const orderB = b.gift_display_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    
    const result = filtered.slice(0, 20)
    
    // 서버 사이드에서 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer(result)
    
    return NextResponse.json({ products: enrichedProducts })
  } catch (error: any) {
    console.error('선물 대상 상품 조회 실패:', error)
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}

