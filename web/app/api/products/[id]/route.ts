import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { PRODUCT_SELECT_FIELDS, enrichProductsServer } from '@/lib/product/product.service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // UUID 형식인지 확인
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)
    
    let data
    let error
    
    // 프로모션 정보 포함해서 조회
    if (isUUID) {
      const result = await supabase
        .from('products')
        .select(PRODUCT_SELECT_FIELDS)
        .eq('id', params.id)
        .neq('status', 'deleted')
        .single()
      
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('products')
        .select(PRODUCT_SELECT_FIELDS)
        .eq('slug', params.id)
        .neq('status', 'deleted')
        .single()
      
      data = result.data
      error = result.error

      // slug로 찾지 못했으면 UUID로 시도
      if ((error || !data) && !isUUID) {
        const retryResult = await supabase
          .from('products')
          .select(PRODUCT_SELECT_FIELDS)
          .eq('id', params.id)
          .neq('status', 'deleted')
          .single()
        
        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error || !data) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 공통 유틸리티로 상품 데이터 보강 (프로모션 등)
    const enrichedProducts = await enrichProductsServer([data])
    const enrichedProduct = enrichedProducts[0] || data
    
    return NextResponse.json(enrichedProduct)
  } catch (error: any) {
    console.error('[API/products/[id]] 상품 조회 실패:', error)
    console.error('[API/products/[id]] 상품 ID:', params.id)
    console.error('[API/products/[id]] 에러 코드:', error?.code)
    console.error('[API/products/[id]] 에러 메시지:', error?.message)
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}




