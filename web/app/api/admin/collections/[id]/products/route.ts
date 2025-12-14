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

    // 상품 추가 (priority는 null로 설정 - 사용자가 원할 때 설정할 수 있도록)
    const collectionProducts = product_ids.map((product_id: string) => ({
      collection_id: params.id,
      product_id,
      priority: null, // 기본값은 null로 설정
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

// PUT: 컬렉션 상품의 priority 업데이트
export async function PUT(
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
    const { collection_product_id, priority } = body

    if (!collection_product_id) {
      return NextResponse.json({ error: 'collection_product_id가 필요합니다.' }, { status: 400 })
    }

    // priority가 null이거나 undefined면 null로 설정, 아니면 숫자 검증
    if (priority !== null && priority !== undefined) {
      if (typeof priority !== 'number' || priority < 0) {
        return NextResponse.json({ error: 'priority는 0 이상의 숫자이거나 null이어야 합니다.' }, { status: 400 })
      }
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

    // priority 업데이트
    const { data, error } = await supabaseAdmin
      .from('collection_products')
      .update({ priority })
      .eq('id', collection_product_id)
      .eq('collection_id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    console.error('priority 업데이트 실패:', error)
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




