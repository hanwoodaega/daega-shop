import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { extractActivePromotion } from '@/lib/product/product.service'
import { getFinalPricing } from '@/lib/product/product.pricing'

export const dynamic = 'force-dynamic'

const MAX_IDS = 100

/**
 * GET /api/cart/details?ids=id1,id2,id3
 * 비로그인 장바구니용: 상품 ID 목록에 대한 최신 상품 정보 반환 (이름, 가격, 이미지, 할인, 상태 등)
 */
export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids')
    if (!idsParam || typeof idsParam !== 'string') {
      return NextResponse.json({ details: [] })
    }
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS)
    if (ids.length === 0) {
      return NextResponse.json({ details: [] })
    }

    const supabase = await createSupabaseServerClient()

    const selectFields = `
      id,
      slug,
      name,
      price,
      brand,
      status,
      weight_gram,
      promotion_products (
        promotion_id,
        promotions (
          id,
          type,
          buy_qty,
          discount_percent,
          is_active
        )
      )
    `

    const { data: products, error } = await supabase
      .from('products')
      .select(selectFields)
      .in('id', ids)

    if (error) {
      console.error('[cart/details] 상품 조회 실패:', error)
      return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
    }

    const productIds = (products || []).map((p: any) => p.id).filter(Boolean)
    let imageMap: Record<string, string | null> = {}
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      const firstByProduct = new Map<string, string | null>()
      imagesData?.forEach((img: any) => {
        if (img?.product_id && !firstByProduct.has(img.product_id)) {
          firstByProduct.set(img.product_id, img.image_url || null)
        }
      })
      imageMap = Object.fromEntries(firstByProduct)
    }

    const details = (products || []).map((product: any) => {
      const promotion = extractActivePromotion(product)
      const pricing = getFinalPricing({
        basePrice: product?.price ?? 0,
        promotion,
        weightGram: product?.weight_gram,
      })
      return {
        productId: product.id,
        slug: product.slug ?? null,
        name: product.name ?? '',
        price: product.price ?? 0,
        brand: product.brand ?? null,
        status: product.status ?? 'active',
        imageUrl: imageMap[product.id] ?? null,
        discount_percent: pricing.discountPercent ?? 0,
      }
    })

    return NextResponse.json({ details })
  } catch (error) {
    console.error('[cart/details] 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
