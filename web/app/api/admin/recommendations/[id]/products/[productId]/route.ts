import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// PATCH: 추천 상품의 sort_order 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, productId } = await params
    const body = await request.json()
    const { sort_order } = body

    if (sort_order === undefined) {
      return NextResponse.json({ error: 'sort_order가 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('recommendation_products')
      .update({ sort_order })
      .eq('recommendation_category_id', id)
      .eq('product_id', productId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    console.error('상품 순서 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

