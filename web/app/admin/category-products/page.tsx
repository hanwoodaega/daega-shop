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
    const now = new Date().toISOString()

    const { data: activeTimedeal } = await supabase
      .from('timedeals')
      .select('id')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const timedealMap = new Map<string, number>()
    if (activeTimedeal) {
      const { data: timedealProducts } = await supabase
        .from('timedeal_products')
        .select('product_id, discount_percent')
        .eq('timedeal_id', activeTimedeal.id)

      if (timedealProducts) {
        timedealProducts.forEach((tp: any) => {
          timedealMap.set(tp.product_id, tp.discount_percent || 0)
        })
      }
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        brand,
        category,
        image_url,
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

    return (data || []).map((product: any) => {
      const promotion = extractActivePromotion(product)
      const timedealDiscount = timedealMap.get(product.id) || 0

      let promotionLabel: string | null = null
      if (timedealDiscount > 0) {
        promotionLabel = `타임딜 ${timedealDiscount}%`
      } else if (promotion?.is_active && promotion?.type === 'bogo' && promotion?.buy_qty) {
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
        image_url: product.image_url,
        promotion_label: promotionLabel,
        promotion_type: promotion?.type || null,
        promotion_discount_percent: promotion?.discount_percent || null,
        promotion_buy_qty: promotion?.buy_qty || null,
        timedeal_discount_percent: timedealDiscount || null,
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

