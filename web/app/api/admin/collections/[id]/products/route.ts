import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// POST: 컬렉션에 상품 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
      .eq('id', id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이 컬렉션에 이미 포함된 상품은 제외 (같은 상품은 다른 컬렉션(best, no9 등)에는 중복 허용)
    const { data: existing } = await supabaseAdmin
      .from('collection_products')
      .select('product_id')
      .eq('collection_id', id)
      .in('product_id', product_ids)

    const existingIds = new Set((existing || []).map((r: { product_id: string }) => r.product_id))
    const toInsert = product_ids.filter((pid: string) => !existingIds.has(pid))

    if (toInsert.length === 0) {
      return NextResponse.json({ error: '선택한 상품이 이미 이 컬렉션에 모두 포함되어 있습니다.' }, { status: 400 })
    }

    // 상품 추가 (priority는 null로 설정)
    const collectionProducts = toInsert.map((product_id: string) => ({
      collection_id: id,
      product_id,
      priority: null,
    }))

    const { data, error } = await supabaseAdmin
      .from('collection_products')
      .insert(collectionProducts)
      .select()

    if (error) {
      return dbErrorResponse('admin/collections/[id]/products POST', error)
    }

    return NextResponse.json({ products: data, added: toInsert.length })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id]/products POST', error)
  }
}

// PUT: 컬렉션 상품의 priority 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
      .eq('id', id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // priority 업데이트
    const { data, error } = await supabaseAdmin
      .from('collection_products')
      .update({ priority })
      .eq('id', collection_product_id)
      .eq('collection_id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/collections/[id]/products PUT', error)
    }

    return NextResponse.json({ product: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id]/products PUT', error)
  }
}

// DELETE: 컬렉션에서 상품 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('collection_products')
      .delete()
      .eq('collection_id', id)
      .eq('product_id', product_id)

    if (error) {
      return dbErrorResponse('admin/collections/[id]/products DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id]/products DELETE', error)
  }
}




