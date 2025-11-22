import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PRODUCT_SELECT_FIELDS, extractActivePromotion } from '@/lib/product-queries'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // slug 또는 UUID로 조회 (프로모션 정보 포함)
    const selectFields = PRODUCT_SELECT_FIELDS
    
    let query = supabase
      .from('products')
      .select(selectFields)
      .eq('slug', params.id)
      .single()

    let { data, error } = await query

    // slug로 찾지 못했으면 UUID로 시도
    if (error || !data) {
      query = supabase
        .from('products')
        .select(selectFields)
        .eq('id', params.id)
        .single()
      
      const result = await query
      data = result.data
      error = result.error
    }

    if (error || !data) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 활성화된 프로모션 찾기
    const activePromotion = extractActivePromotion(data)

    return NextResponse.json({
      ...data,
      promotion: activePromotion,
    })
  } catch (error) {
    console.error('상품 조회 실패:', error)
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}




