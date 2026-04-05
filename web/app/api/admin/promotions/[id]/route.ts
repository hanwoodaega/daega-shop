import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { getProductMainImageUrlMap } from '@/lib/product/product-image-utils'

// GET: 프로모션 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    // 프로모션 정보
    const { data: promotion, error: promoError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single()

    if (promoError || !promotion) {
      return NextResponse.json({ error: '프로모션을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연결된 상품 목록 (image_url 제거 - product_images 테이블에서 조회)
    const { data: products, error: productsError } = await supabaseAdmin
      .from('promotion_products')
      .select(`
        id,
        product_id,
        group_id,
        priority,
        products (
          id,
          name,
          price,
          brand
        )
      `)
      .eq('promotion_id', id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (productsError) {
      return dbErrorResponse('admin/promotions/[id] GET products', productsError)
    }

    // product_images에서 이미지 URL 가져오기
    const promotionProducts = products || []
    const productIds = promotionProducts
      .map((pp: any) => {
        const product = Array.isArray(pp.products) ? pp.products[0] : pp.products
        return product?.id
      })
      .filter((id: string | undefined): id is string => !!id)

    const imageUrlMap = await getProductMainImageUrlMap(productIds)

    // 이미지 URL을 포함하여 응답 구성
    const productsWithImages = promotionProducts.map((pp: any) => {
      const product = Array.isArray(pp.products) ? pp.products[0] : pp.products
      if (!product) return pp

      return {
        ...pp,
        products: {
          ...product,
          image_url: imageUrlMap.get(product.id) || null,
        },
      }
    })

    return NextResponse.json({
      promotion,
      products: productsWithImages,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/promotions/[id] GET', error)
  }
}

// PUT: 프로모션 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { title, type, buy_qty, discount_percent, is_active, product_ids, group_id } = body

    // 유효성 검사
    if (type === 'bogo' && !buy_qty) {
      return NextResponse.json({ error: 'BOGO 타입은 buy_qty가 필요합니다.' }, { status: 400 })
    }

    if (type === 'percent' && !discount_percent) {
      return NextResponse.json({ error: 'Percent 타입은 discount_percent가 필요합니다.' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (is_active !== undefined) updateData.is_active = is_active

    if (type === 'bogo') {
      updateData.buy_qty = buy_qty
      updateData.discount_percent = null
    } else if (type === 'percent') {
      updateData.discount_percent = discount_percent
      updateData.buy_qty = null
    }

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin/promotions/[id] PUT', error)
    }

    // 상품 목록 동기화 (관리자 수정 시 선택한 전체 ID로 교체)
    if (Array.isArray(product_ids)) {
      const { error: delError } = await supabaseAdmin
        .from('promotion_products')
        .delete()
        .eq('promotion_id', id)

      if (delError) {
        return dbErrorResponse('admin/promotions/[id] PUT delete promotion_products', delError)
      }

      if (product_ids.length > 0) {
        const gid = group_id !== undefined && group_id !== '' ? group_id : null
        const rows = product_ids.map((product_id: string, index: number) => ({
          promotion_id: id,
          product_id,
          group_id: gid,
          priority: index,
        }))

        const { error: insError } = await supabaseAdmin.from('promotion_products').insert(rows)

        if (insError) {
          return dbErrorResponse('admin/promotions/[id] PUT insert promotion_products', insError)
        }
      }
    }

    return NextResponse.json({ promotion: data })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/promotions/[id] PUT', error)
  }
}

// DELETE: 프로모션 소프트 삭제 (is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { error } = await supabaseAdmin
      .from('promotions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return dbErrorResponse('admin/promotions/[id] DELETE', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/promotions/[id] DELETE', error)
  }
}




