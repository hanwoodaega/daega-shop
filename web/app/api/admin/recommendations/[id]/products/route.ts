import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'

// GET: 추천 카테고리의 상품 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    
    const { data, error } = await supabaseAdmin
      .from('recommendation_products')
      .select(`
        id,
        product_id,
        sort_order,
        products (
          id,
          name,
          price,
          brand,
          category
        )
      `)
      .eq('recommendation_category_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      return dbErrorResponse('admin/recommendations/[id]/products GET', error)
    }

    return NextResponse.json({ products: data || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id]/products GET', error)
  }
}

// POST: 추천 카테고리에 상품 추가
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
    const { products: productsData } = body

    if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
      return NextResponse.json({ error: '상품 배열이 필요합니다.' }, { status: 400 })
    }

    // 카테고리 존재 확인
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('recommendation_categories')
      .select('id')
      .eq('id', id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: '추천 카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 상품 추가
    const recommendationProducts = productsData.map((item: { product_id: string; sort_order?: number }) => ({
      recommendation_category_id: id,
      product_id: item.product_id,
      sort_order: item.sort_order || 0,
    }))

    const { data, error } = await supabaseAdmin
      .from('recommendation_products')
      .insert(recommendationProducts)
      .select()

    if (error) {
      return dbErrorResponse('admin/recommendations/[id]/products POST', error)
    }

    return NextResponse.json({ products: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id]/products POST', error)
  }
}

// DELETE: 추천 카테고리에서 상품 제거
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
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('recommendation_products')
      .delete()
      .eq('recommendation_category_id', id)
      .eq('product_id', product_id)

    if (error) {
      return dbErrorResponse('admin/recommendations/[id]/products DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/recommendations/[id]/products DELETE', error)
  }
}

