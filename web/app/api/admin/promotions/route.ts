import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 프로모션 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const is_active = searchParams.get('is_active')

    let query = supabaseAdmin
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ promotions: data || [] })
  } catch (error: any) {
    console.error('프로모션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 프로모션 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, type, buy_qty, discount_percent, is_active, product_ids, group_id } = body

    // 유효성 검사
    if (!title || !type) {
      return NextResponse.json({ error: '제목과 타입은 필수입니다.' }, { status: 400 })
    }

    if (type === 'bogo' && !buy_qty) {
      return NextResponse.json({ error: 'BOGO 타입은 buy_qty가 필요합니다.' }, { status: 400 })
    }

    if (type === 'percent' && !discount_percent) {
      return NextResponse.json({ error: 'Percent 타입은 discount_percent가 필요합니다.' }, { status: 400 })
    }

    // 프로모션 생성
    const { data: promotion, error: promoError } = await supabaseAdmin
      .from('promotions')
      .insert({
        title,
        type,
        buy_qty: type === 'bogo' ? buy_qty : null,
        discount_percent: type === 'percent' ? discount_percent : null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (promoError) {
      return NextResponse.json({ error: promoError.message }, { status: 400 })
    }

    // 상품 연결 (product_ids가 있는 경우)
    if (product_ids && product_ids.length > 0) {
      const promotionProducts = product_ids.map((product_id: string, index: number) => ({
        promotion_id: promotion.id,
        product_id,
        group_id: group_id || null,
        priority: index,
      }))

      const { error: productsError } = await supabaseAdmin
        .from('promotion_products')
        .insert(promotionProducts)

      if (productsError) {
        // 프로모션은 생성되었지만 상품 연결 실패 시 프로모션 삭제
        await supabaseAdmin.from('promotions').delete().eq('id', promotion.id)
        return NextResponse.json({ error: productsError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ promotion })
  } catch (error: any) {
    console.error('프로모션 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}




