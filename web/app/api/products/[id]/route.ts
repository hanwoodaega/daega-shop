import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // slug 또는 UUID로 조회 (프로모션 정보 포함)
    const selectFields = `
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
    `
    
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
    let activePromotion = null
    if (data.promotion_products && data.promotion_products.length > 0) {
      const now = new Date()
      for (const pp of data.promotion_products) {
        const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
        if (promo && promo.is_active) {
          // 날짜 체크
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

    return NextResponse.json({
      ...data,
      promotion: activePromotion,
    })
  } catch (error) {
    console.error('상품 조회 실패:', error)
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}




