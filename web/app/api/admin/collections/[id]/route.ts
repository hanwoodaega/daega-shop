import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { getProductMainImageUrlMap } from '@/lib/product-image-utils'

// GET: 컬렉션 상세 조회 (상품 목록 포함)
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
    // 컬렉션 정보
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('id', params.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연결된 상품 목록 (image_url 제거 - product_images 테이블에서 조회)
    const { data: products, error: productsError } = await supabaseAdmin
      .from('collection_products')
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
      .eq('collection_id', params.id)
      .order('priority', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // product_images에서 이미지 URL 가져오기
    const collectionProducts = products || []
    const productIds = collectionProducts
      .map((cp: any) => {
        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
        return product?.id
      })
      .filter((id: string | undefined): id is string => !!id)

    const imageUrlMap = await getProductMainImageUrlMap(productIds)

    // 이미지 URL을 포함하여 응답 구성
    const productsWithImages = collectionProducts.map((cp: any) => {
      const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
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
      collection,
      products: productsWithImages,
    })
  } catch (error: any) {
    console.error('컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 컬렉션 수정
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
    const { type, title, description, image_url, color_theme, sort_order, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (type !== undefined) {
      // 같은 type이 다른 컬렉션에 있는지 확인
      const { data: existing } = await supabaseAdmin
        .from('collections')
        .select('id')
        .eq('type', type)
        .neq('id', params.id)
        .maybeSingle()
      
      if (existing) {
        return NextResponse.json({ error: '이미 존재하는 타입입니다.' }, { status: 400 })
      }
      updateData.type = type
    }
    if (title !== undefined) updateData.title = title || null
    if (description !== undefined) updateData.description = description || null
    if (image_url !== undefined) updateData.image_url = image_url || null
    if (color_theme !== undefined) updateData.color_theme = color_theme || null
    if (sort_order !== undefined) updateData.sort_order = sort_order ?? 0
    if (is_active !== undefined) updateData.is_active = is_active ?? true

    const { data, error } = await supabaseAdmin
      .from('collections')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ collection: data })
  } catch (error: any) {
    console.error('컬렉션 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 컬렉션 삭제
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
    // CASCADE로 collection_products도 자동 삭제됨
    const { error } = await supabaseAdmin
      .from('collections')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('컬렉션 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

