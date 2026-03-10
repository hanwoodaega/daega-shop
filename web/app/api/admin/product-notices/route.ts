import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'

// GET: 메타 + 특정 상품의 고시값 조회
export async function GET(request: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const productId = request.nextUrl.searchParams.get('product_id')

  const [catRes, fieldRes, valueRes, productRes] = await Promise.all([
    supabaseAdmin.from('product_notice_categories').select('id, code, name, created_at').order('name', { ascending: true }),
    supabaseAdmin.from('product_notice_fields').select('id, category_id, key, label, required, sort_order, created_at').order('category_id', { ascending: true }).order('sort_order', { ascending: true }),
    productId
      ? supabaseAdmin
          .from('product_notice_values')
          .select('id, product_id, field_id, value, created_at')
          .eq('product_id', productId)
      : Promise.resolve({ data: null, error: null } as any),
    productId
      ? supabaseAdmin
          .from('products')
          .select('id, notice_category_id')
          .eq('id', productId)
          .single()
      : Promise.resolve({ data: null, error: null } as any),
  ])

  if (catRes.error) {
    console.error('[product-notices] categories error:', catRes.error)
    return NextResponse.json({ error: catRes.error.message }, { status: 500 })
  }
  if (fieldRes.error) {
    console.error('[product-notices] fields error:', fieldRes.error)
    return NextResponse.json({ error: fieldRes.error.message }, { status: 500 })
  }
  if (valueRes.error) {
    console.error('[product-notices] values error:', valueRes.error)
    return NextResponse.json({ error: valueRes.error.message }, { status: 500 })
  }
  if (productRes.error && productId) {
    console.error('[product-notices] product error:', productRes.error)
  }

  return NextResponse.json({
    categories: catRes.data ?? [],
    fields: fieldRes.data ?? [],
    values: valueRes.data ?? [],
    notice_category_id: productRes.data?.notice_category_id ?? null,
  })
}

// POST: 상품별 고시 카테고리 및 값 저장
export async function POST(request: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    product_id?: string
    notice_category_id?: string | null
    values?: { field_id: string; value: string }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const productId = body.product_id?.trim()
  if (!productId) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  }

  // 1) 상품에 카테고리 설정
  const { error: updateError } = await supabaseAdmin
    .from('products')
    .update({ notice_category_id: body.notice_category_id || null })
    .eq('id', productId)

  if (updateError) {
    console.error('[product-notices] update product error:', updateError)
    return NextResponse.json({ error: updateError.message || '상품 업데이트 실패' }, { status: 500 })
  }

  // 2) 기존 값 삭제 후 재삽입 (간단한 구조)
  const { error: deleteError } = await supabaseAdmin
    .from('product_notice_values')
    .delete()
    .eq('product_id', productId)

  if (deleteError) {
    console.error('[product-notices] delete old values error:', deleteError)
    return NextResponse.json({ error: deleteError.message || '기존 값 삭제 실패' }, { status: 500 })
  }

  const cleanValues = (body.values || [])
    .map((v) => ({
      field_id: v.field_id,
      value: (v.value ?? '').trim(),
    }))
    .filter((v) => v.field_id && v.value !== '')

  if (cleanValues.length > 0) {
    const insertPayload = cleanValues.map((v) => ({
      product_id: productId,
      field_id: v.field_id,
      value: v.value,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('product_notice_values')
      .insert(insertPayload)

    if (insertError) {
      console.error('[product-notices] insert values error:', insertError)
      return NextResponse.json({ error: insertError.message || '값 저장 실패' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

