import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { getProductMainImageUrlMap } from '@/lib/product-image-utils'

// GET: 카테고리 상세 조회 (상품 목록 포함)
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
    // 카테고리 정보
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', params.id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연결된 상품 목록
    const { data: products, error: productsError } = await supabaseAdmin
      .from('category_products')
      .select(`
        id,
        product_id,
        priority,
        products (
          id,
          name,
          price,
          brand,
          category
        )
      `)
      .eq('category_id', params.id)
      .order('priority', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // product_images에서 이미지 URL 가져오기
    const categoryProducts = products || []
    const productIds = categoryProducts
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        return product?.id
      })
      .filter((id: string | undefined): id is string => !!id)

    const imageUrlMap = await getProductMainImageUrlMap(productIds)

    // 이미지 URL을 포함하여 응답 구성
    const productsWithImages = categoryProducts.map((cp: any) => {
      const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
      return {
        id: cp.id,
        product_id: cp.product_id,
        priority: cp.priority,
        products: product ? {
          ...product,
          image_url: imageUrlMap.get(product.id) || null,
        } : null,
      }
    })

    return NextResponse.json({
      category,
      products: productsWithImages,
    })
  } catch (error: any) {
    console.error('카테고리 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 카테고리 수정
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
    const { title, description, is_active } = body

    // 카테고리 존재 확인
    const { data: existingCategory } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existingCategory) {
      return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    const updateData: any = {}

    if (title !== undefined) updateData.title = title || null
    if (description !== undefined) updateData.description = description || null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    console.error('카테고리 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 카테고리 삭제
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
    // 카테고리 존재 확인
    const { data: existingCategory } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existingCategory) {
      return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 카테고리 상품 먼저 삭제
    const { error: productsError } = await supabaseAdmin
      .from('category_products')
      .delete()
      .eq('category_id', params.id)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // 카테고리 삭제
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('카테고리 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

