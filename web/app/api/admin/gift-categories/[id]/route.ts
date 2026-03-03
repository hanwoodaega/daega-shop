import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { getProductMainImageUrlMap } from '@/lib/product/product-image-utils'
import { normalizeCategoryProduct } from '@/app/admin/gift-management/_utils/fetchers'

// GET: 선물 카테고리 상세 조회 (상품 목록 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    // 카테고리 정보
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('gift_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연결된 상품 목록 (image_url 제거 - product_images 테이블에서 조회)
    let productsQuery = supabaseAdmin
      .from('gift_category_products')
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
      .eq('gift_category_id', id)

    // product_id가 제공되면 필터링 (존재 여부 확인용)
    if (productId) {
      productsQuery = productsQuery.eq('product_id', productId)
    }

    const { data: products, error: productsError } = await productsQuery
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // product_images에서 이미지 URL 가져오기
    const categoryProducts = products || []
    const productIds = categoryProducts
      .map((cp: any) => {
        const product = normalizeCategoryProduct(cp)
        return product?.id
      })
      .filter((id: string | undefined): id is string => !!id)

    const imageUrlMap = await getProductMainImageUrlMap(productIds)

    // 이미지 URL을 포함하여 응답 구성
    const productsWithImages = categoryProducts.map((cp: any) => {
      const product = normalizeCategoryProduct(cp)
      if (!product) return cp

      return {
        ...cp,
        products: {
          ...product,
          image_url: imageUrlMap.get(product.id) || null,
        },
      }
    })

    return NextResponse.json({
      category,
      products: productsWithImages,
    })
  } catch (error: any) {
    console.error('선물 카테고리 조회 실패:', error)
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// PUT: 선물 카테고리 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await assertAdmin()
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
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE: 선물 카테고리 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await assertAdmin()
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
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}




