import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PRODUCT_SELECT_FIELDS } from '@/lib/product-queries'
import { enrichProductsServer } from '@/lib/product-queries-server'
import { getTimedealDiscountPercent } from '@/lib/timedeal-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // slug 또는 UUID로 조회 (프로모션 정보 포함)
    const selectFields = PRODUCT_SELECT_FIELDS
    
    let query = supabase
      .from('products')
      .select(selectFields)
      .eq('slug', params.id)
      .neq('status', 'deleted') // deleted 상태 제외
      .single()

    let { data, error } = await query

    // slug로 찾지 못했으면 UUID로 시도
    if (error || !data) {
      query = supabase
        .from('products')
        .select(selectFields)
        .eq('id', params.id)
        .neq('status', 'deleted') // deleted 상태 제외
        .single()
      
      const result = await query
      data = result.data
      error = result.error
    }

    if (error || !data) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 타임딜 할인율 조회
    const timedealDiscountPercent = await getTimedealDiscountPercent(data.id)
    const timedealDiscountMap = new Map<string, number>()
    timedealDiscountMap.set(data.id, timedealDiscountPercent)

    // 공통 유틸리티 함수로 상품 데이터 보강
    const enrichedProducts = await enrichProductsServer([data], timedealDiscountMap)
    const enrichedProduct = enrichedProducts[0]

    return NextResponse.json(enrichedProduct)
  } catch (error) {
    console.error('상품 조회 실패:', error)
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}




