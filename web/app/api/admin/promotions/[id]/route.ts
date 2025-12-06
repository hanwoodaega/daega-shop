import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { getProductMainImageUrlMap } from '@/lib/product-image-utils'

// GET: 프로모션 상세 조회
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
    // 프로모션 정보
    const { data: promotion, error: promoError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('id', params.id)
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
      .eq('promotion_id', params.id)
      .order('priority', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
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
  } catch (error: any) {
    console.error('프로모션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 프로모션 수정
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
    const { title, type, buy_qty, discount_percent, is_active } = body

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
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ promotion: data })
  } catch (error: any) {
    console.error('프로모션 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 프로모션 삭제
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
    // CASCADE로 promotion_products도 자동 삭제됨
    const { error } = await supabaseAdmin
      .from('promotions')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('프로모션 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}




