import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { getProductMainImageUrlMap } from '@/lib/product/product-image-utils'

// GET: 컬렉션 상세 조회 (상품 목록 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    // 컬렉션 정보
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('id', id)
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
      .eq('collection_id', id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (productsError) {
      return dbErrorResponse('admin/collections/[id] GET products', productsError)
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
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id] GET', error)
  }
}

// PUT: 컬렉션 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { title, description, image_url, color_theme, sort_order, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // type 필드 검증 및 정규화 (trim + lowercase)
    if (body.type !== undefined) {
      const type = String(body.type).trim().toLowerCase()

      if (!type) {
        return NextResponse.json({ error: 'type은 비어있을 수 없습니다.' }, { status: 400 })
      }

      // 같은 type이 다른 컬렉션에 있는지 확인
      const { data: existing } = await supabaseAdmin
        .from('collections')
        .select('id')
        .eq('type', type)
        .neq('id', id)
        .maybeSingle()
      
      if (existing) {
        return NextResponse.json({ error: '이미 존재하는 타입입니다.' }, { status: 400 })
      }
      
      updateData.type = type
    }

    // color_theme 검증 (객체여야 함, description_color는 사용하지 않음)
    if (color_theme !== undefined && color_theme !== null) {
      if (typeof color_theme !== 'object' || Array.isArray(color_theme)) {
        return NextResponse.json({ error: 'color_theme은 객체여야 합니다.' }, { status: 400 })
      }
      if (!color_theme.background) {
        return NextResponse.json({ error: 'color_theme.background가 필요합니다.' }, { status: 400 })
      }
    }

    if (title !== undefined) updateData.title = title || null
    if (description !== undefined) updateData.description = description || null
    if (image_url !== undefined) updateData.image_url = image_url || null
    if (color_theme !== undefined) updateData.color_theme = { background: color_theme.background }
    if (sort_order !== undefined) updateData.sort_order = sort_order ?? 0
    if (is_active !== undefined) updateData.is_active = is_active ?? true

    const { data, error } = await supabaseAdmin
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/collections/[id] PUT', error)
    }

    return NextResponse.json({ collection: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id] PUT', error)
  }
}

// DELETE: 컬렉션 소프트 삭제 (is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { error } = await supabaseAdmin
      .from('collections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return dbErrorResponse('admin/collections/[id] DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/collections/[id] DELETE', error)
  }
}

