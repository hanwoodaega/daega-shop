import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// POST: 컬렉션에 상품 추가
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
    const { product_ids } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: '상품 ID 배열이 필요합니다.' }, { status: 400 })
    }

    // 컬렉션 존재 확인
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('id', params.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 기존 상품들의 최대 priority 확인
    const { data: existingProducts } = await supabaseAdmin
      .from('collection_products')
      .select('priority')
      .eq('collection_id', params.id)
      .order('priority', { ascending: false })
      .limit(1)

    const maxPriority = existingProducts && existingProducts.length > 0 
      ? existingProducts[0].priority 
      : -1

    // 상품 추가
    const collectionProducts = product_ids.map((product_id: string, index: number) => ({
      collection_id: params.id,
      product_id,
      priority: maxPriority + 1 + index,
    }))

    const { data, error } = await supabaseAdmin
      .from('collection_products')
      .insert(collectionProducts)
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

// DELETE: 컬렉션에서 상품 제거
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
      .from('collection_products')
      .delete()
      .eq('collection_id', params.id)
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



