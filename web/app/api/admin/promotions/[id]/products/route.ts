import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'

// POST: 프로모션에 상품 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { product_ids, group_id } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: '상품 ID 배열이 필요합니다.' }, { status: 400 })
    }

    // 프로모션 존재 확인
    const { data: promotion, error: promoError } = await supabaseAdmin
      .from('promotions')
      .select('id')
      .eq('id', params.id)
      .single()

    if (promoError || !promotion) {
      return NextResponse.json({ error: '프로모션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 기존 상품들의 최대 priority 확인
    const { data: existingProducts } = await supabaseAdmin
      .from('promotion_products')
      .select('priority')
      .eq('promotion_id', params.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)

    const maxPriority = existingProducts && existingProducts.length > 0 
      ? existingProducts[0].priority 
      : -1

    // 상품 추가
    const promotionProducts = product_ids.map((product_id: string, index: number) => ({
      promotion_id: params.id,
      product_id,
      group_id: group_id || null,
      priority: maxPriority + 1 + index,
    }))

    const { data, error } = await supabaseAdmin
      .from('promotion_products')
      .insert(promotionProducts)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ products: data })
  } catch (error: any) {
    console.error('상품 추가 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 프로모션에서 상품 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('promotion_products')
      .delete()
      .eq('promotion_id', params.id)
      .eq('product_id', product_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('상품 제거 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}




