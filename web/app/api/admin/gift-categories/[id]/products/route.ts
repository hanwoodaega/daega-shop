import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// POST: 선물 카테고리에 상품 추가
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
    const { id } = await params
    const body = await request.json()
    const { product_ids, priority } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: '상품 ID 배열이 필요합니다.' }, { status: 400 })
    }

    // 기존 상품들의 최대 priority 확인
    const { data: existingProducts } = await supabaseAdmin
      .from('gift_category_products')
      .select('priority')
      .eq('gift_category_id', id)
      .order('priority', { ascending: false })
      .limit(1)

    let nextPriority = priority || ((existingProducts?.[0]?.priority || 0) + 1)

    // 상품 추가
    const insertData = product_ids.map((productId: string, index: number) => ({
      gift_category_id: id,
      product_id: productId,
      priority: priority ? priority + index : nextPriority + index,
    }))

    const { error } = await supabaseAdmin
      .from('gift_category_products')
      .insert(insertData)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('상품 추가 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 선물 카테고리에서 상품 제거
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
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('gift_category_products')
      .delete()
      .eq('gift_category_id', id)
      .eq('product_id', productId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('상품 제거 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 상품의 priority 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { product_id, priority } = body

    if (!product_id || priority === undefined) {
      return NextResponse.json({ error: 'product_id와 priority가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('gift_category_products')
      .update({ priority })
      .eq('gift_category_id', id)
      .eq('product_id', product_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('상품 priority 업데이트 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

