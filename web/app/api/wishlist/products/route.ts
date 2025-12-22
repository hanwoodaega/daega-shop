import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { enrichProductsServer } from '@/lib/product/product-queries-server'
import { PRODUCT_SELECT_FIELDS } from '@/lib/product/product-queries'

// POST: 위시리스트 상품 목록 조회 (상품 정보 포함)
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const supabase = createSupabaseServerClient()
    
    // 상품 조회
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_FIELDS)
      .in('id', productIds)
      .neq('status', 'deleted')

    if (productsError) {
      console.error('[API/wishlist/products] 위시리스트 상품 조회 실패:', productsError)
      console.error('[API/wishlist/products] 에러 코드:', productsError.code)
      console.error('[API/wishlist/products] 에러 메시지:', productsError.message)
      return NextResponse.json({ products: [] })
    }

    if (!productsData || productsData.length === 0) {
      return NextResponse.json({ products: [] })
    }

    // 서버 사이드에서 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer(productsData)

    return NextResponse.json({ products: enrichedProducts })
  } catch (error: any) {
    console.error('위시리스트 상품 조회 실패:', error)
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}


