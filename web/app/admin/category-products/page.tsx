import { assertAdmin } from '@/lib/auth/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { redirect } from 'next/navigation'
import CategoryProductsClient from './_components/CategoryProductsClient'
import type { Category, Product } from './_types'
import { extractActivePromotion } from '@/lib/product/product.service'

export type { Category, Product }

// type별 카테고리 조회 (없으면 null)
async function getCategoryByType(type: string): Promise<Category | null> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error(`카테고리 조회 실패 (${type}):`, error)
    return null
  }
}

// 서버에서 상품 목록 조회 (최대 1000개)
async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        brand,
        category,
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
      `)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('상품 조회 실패:', error)
      return []
    }

    const products = data || []
    const productIds = products.map((product: any) => product.id)
    let imageMap: Record<string, string | null> = {}

    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)

      if (imagesData) {
        imageMap = imagesData.reduce((acc: Record<string, string | null>, img: any) => {
          acc[img.product_id] = img.image_url
          return acc
        }, {})
      }
    }

    return products.map((product: any) => {
      const promotion = extractActivePromotion(product)

      let promotionLabel: string | null = null
      if (promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty) {
        promotionLabel = `프로모션 ${promotion.buy_qty}+1`
      } else if (promotion?.is_active && promotion?.type === 'percent' && promotion?.discount_percent) {
        promotionLabel = `프로모션 ${promotion.discount_percent}%`
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        brand: product.brand,
        category: product.category,
        image_url: imageMap[product.id] || null,
        promotion_label: promotionLabel,
        promotion_type: promotion?.type || null,
        promotion_discount_percent: promotion?.discount_percent || null,
        promotion_buy_qty: promotion?.buy_qty || null,
      }
    })
  } catch (error) {
    console.error('상품 조회 실패:', error)
    return []
  }
}

// 서버에서 프로모션 적용 상품 ID 목록 조회
async function getPromotedProductIds(): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient()
    
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('id')
      .eq('is_active', true)

    if (promoError || !promotions || promotions.length === 0) {
      return []
    }

    const promotionIds = promotions.map(p => p.id)
    const { data: promotionProducts, error: productsError } = await supabase
      .from('promotion_products')
      .select('product_id')
      .in('promotion_id', promotionIds)

    if (productsError) {
      console.error('프로모션 상품 조회 실패:', productsError)
      return []
    }

    const productIds = (promotionProducts || []).map((pp: any) => pp.product_id)
    return Array.from(new Set(productIds))
  } catch (error) {
    console.error('프로모션 상품 조회 실패:', error)
    return []
  }
}

export default async function CategoryProductsPage() {
  // 서버 사이드 인증 체크
  try {
    assertAdmin()
  } catch (error) {
    redirect('/admin/login?next=/admin/category-products')
  }

  // 초기 데이터 가져오기 (병렬 처리)
  const [bestCategory, saleCategory, no9Category, products, promotedProductIds] = await Promise.all([
    getCategoryByType('best'),
    getCategoryByType('sale'),
    getCategoryByType('no9'),
    getProducts(),
    getPromotedProductIds(),
  ])

  return (
    <CategoryProductsClient
      bestCategory={bestCategory}
      saleCategory={saleCategory}
      no9Category={no9Category}
      initialProducts={products}
      initialPromotedProductIds={promotedProductIds}
    />
  )
}

