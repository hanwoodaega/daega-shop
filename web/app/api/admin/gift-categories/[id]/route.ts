import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 선물 카테고리 상세 조회 (상품 목록 포함)
export async function GET(
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

    // 카테고리 정보
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('gift_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연결된 상품 목록
    const { data: products, error: productsError } = await supabaseAdmin
      .from('gift_category_products')
      .select(`
        id,
        product_id,
        priority,
        products (
          id,
          name,
          price,
          image_url,
          brand,
          category
        )
      `)
      .eq('gift_category_id', id)
      .order('priority', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    return NextResponse.json({
      category,
      products: products || [],
    })
  } catch (error: any) {
    console.error('선물 카테고리 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 선물 카테고리 수정
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
    const { id } = await params
    const body = await request.json()
    const { name, slug, priority } = body

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (priority !== undefined) updateData.priority = priority

    const { data, error } = await supabaseAdmin
      .from('gift_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('선물 카테고리 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 선물 카테고리 삭제
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

    // CASCADE로 gift_category_products도 자동 삭제됨
    const { error } = await supabaseAdmin
      .from('gift_categories')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('선물 카테고리 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}




