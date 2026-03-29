import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 프로모션 목록 조회
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const is_activeParam = searchParams.get('is_active')

    let query = supabaseAdmin
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    // 목록은 기본적으로 활성(is_active=true)만 표시. 소프트 삭제된 항목 제외
    if (is_activeParam !== null && is_activeParam !== '') {
      query = query.eq('is_active', is_activeParam === 'true')
    } else {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return dbErrorResponse('admin/promotions GET', error)
    }

    return NextResponse.json({ promotions: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/promotions GET', error)
  }
}

// POST: 프로모션 생성
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
      return dbErrorResponse('admin/promotions POST insert', promoError)
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
        return dbErrorResponse('admin/promotions POST promotion_products', productsError)
      }
    }

    return NextResponse.json({ promotion })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/promotions POST', error)
  }
}




