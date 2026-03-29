import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// POST: 선물 카테고리에 상품 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

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
      .order('created_at', { ascending: true })
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
      return dbErrorResponse('admin/gift-categories/[id]/products POST', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/gift-categories/[id]/products POST', error)
  }
}

// DELETE: 선물 카테고리에서 상품 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productIds = searchParams.getAll('product_id')

    // 빈 배열 방어 코드 (Supabase .in()에 빈 배열이 들어가면 위험)
    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    // 단일 또는 다중 상품 삭제 지원
    const { error } = await supabaseAdmin
      .from('gift_category_products')
      .delete()
      .eq('gift_category_id', id)
      .in('product_id', productIds)

    if (error) {
      return dbErrorResponse('admin/gift-categories/[id]/products DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/gift-categories/[id]/products DELETE', error)
  }
}

// PATCH: 상품의 priority 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { product_id, priority } = body

    if (!product_id || priority === undefined) {
      return NextResponse.json({ error: 'product_id와 priority가 필요합니다.' }, { status: 400 })
    }

    // priority 타입 검증 및 파싱 (문자열이 올 수 있으므로)
    const parsedPriority = Number(priority)
    if (isNaN(parsedPriority)) {
      return NextResponse.json({ error: 'priority는 숫자여야 합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('gift_category_products')
      .update({ priority: parsedPriority })
      .eq('gift_category_id', id)
      .eq('product_id', product_id)

    if (error) {
      return dbErrorResponse('admin/gift-categories/[id]/products PATCH', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/gift-categories/[id]/products PATCH', error)
  }
}




