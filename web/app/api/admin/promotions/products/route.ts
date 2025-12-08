import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 모든 활성 프로모션의 상품 ID 목록 조회 (N+1 문제 해결)
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 활성 프로모션 조회
    const { data: promotions, error: promoError } = await supabaseAdmin
      .from('promotions')
      .select('id')
      .eq('is_active', true)

    if (promoError) {
      return NextResponse.json({ error: promoError.message }, { status: 400 })
    }

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({ product_ids: [] })
    }

    // 모든 활성 프로모션의 상품 ID를 한 번에 조회
    const promotionIds = promotions.map(p => p.id)
    const { data: promotionProducts, error: productsError } = await supabaseAdmin
      .from('promotion_products')
      .select('product_id')
      .in('promotion_id', promotionIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // 중복 제거하여 Set으로 변환
    const productIds = Array.from(new Set((promotionProducts || []).map((pp: any) => pp.product_id)))

    return NextResponse.json({ product_ids: productIds })
  } catch (error: any) {
    console.error('프로모션 상품 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

