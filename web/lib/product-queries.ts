/**
 * 상품 관련 공통 쿼리 유틸리티
 */

/**
 * 기본 상품 select 필드 (프로모션 정보 포함)
 */
export const PRODUCT_SELECT_FIELDS = `
  id,
  slug,
  brand,
  name,
  price,
  image_url,
  category,
  average_rating,
  review_count,
  weight_gram,
  status,
  created_at,
  updated_at,
  promotion_products (
    promotion_id,
    promotions (
      id,
      type,
      buy_qty,
      discount_percent,
      is_active,
      start_at,
      end_at
    )
  )
`

/**
 * 간단한 상품 select 필드 (프로모션 정보 제외)
 */
export const SIMPLE_PRODUCT_SELECT_FIELDS = `
  id,
  slug,
  brand,
  name,
  price,
  image_url,
  category,
  average_rating,
  review_count,
  weight_gram,
  status
`

/**
 * 프로모션 정보 추출 (활성화된 프로모션만)
 */
export function extractActivePromotion(product: any): any | null {
  if (!product?.promotion_products || !Array.isArray(product.promotion_products) || product.promotion_products.length === 0) {
    return null
  }

  const now = new Date()
  
  for (const pp of product.promotion_products) {
    const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
    
    if (promo && promo.is_active) {
      // 날짜 체크
      const startAt = promo.start_at ? new Date(promo.start_at) : null
      const endAt = promo.end_at ? new Date(promo.end_at) : null
      const isInDateRange = (!startAt || now >= startAt) && (!endAt || now <= endAt)
      
      if (isInDateRange) {
        return promo
      }
    }
  }
  
  return null
}

/**
 * 프로모션 타입 문자열 생성 (BOGO인 경우)
 */
export function getPromotionTypeString(promotion: any): '1+1' | '2+1' | '3+1' | undefined {
  if (promotion && promotion.type === 'bogo' && promotion.buy_qty) {
    return `${promotion.buy_qty}+1` as '1+1' | '2+1' | '3+1'
  }
  return undefined
}

/**
 * 프로모션 정보 추출 (단순 버전 - 날짜 체크 없음)
 */
export function extractPromotion(product: any): any | null {
  if (!product?.promotion_products || !Array.isArray(product.promotion_products) || product.promotion_products.length === 0) {
    return null
  }
  
  const pp = Array.isArray(product.promotion_products[0]) 
    ? product.promotion_products[0] 
    : product.promotion_products[0]
  
  return pp?.promotions || null
}

// enrichProductsServer는 서버 사이드 전용이므로 별도 파일로 분리
// lib/product-queries-server.ts 참조

/**
 * 클라이언트 사이드에서 상품 데이터 보강 (프로모션, 타임딜 할인율 등)
 * @param products 상품 배열
 * @param timedealDiscountMap 타임딜 할인율 맵 (선택사항, 없으면 조회)
 * @returns 보강된 상품 배열
 */
export async function enrichProducts(
  products: any[],
  timedealDiscountMap?: Map<string, number>
): Promise<any[]> {
  if (!products || products.length === 0) {
    return []
  }

  // 타임딜 할인율 맵이 없으면 조회
  let discountMap = timedealDiscountMap
  if (!discountMap) {
    discountMap = await fetchTimedealDiscountMap(products.map((p: any) => p.id))
  }

  // 상품 데이터 보강
  return products.map((product: any) => {
    // 활성화된 프로모션 찾기
    const activePromotion = extractActivePromotion(product)

    // 타임딜 할인율 조회
    const timedealDiscountPercent = discountMap?.get(product.id) || 0

    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: activePromotion,
      timedeal_discount_percent: timedealDiscountPercent,
    }
  })
}

/**
 * 클라이언트 사이드에서 타임딜 할인율 맵 조회
 * @param productIds 상품 ID 배열
 * @returns 타임딜 할인율 맵
 */
async function fetchTimedealDiscountMap(productIds: string[]): Promise<Map<string, number>> {
  const discountMap = new Map<string, number>()
  
  if (productIds.length === 0) {
    return discountMap
  }

  try {
    // 동적 import로 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return discountMap
    }

    const { supabase } = await import('./supabase')
    const now = new Date().toISOString()
    
    // 활성 타임딜 조회
    const { data: activeTimedeal } = await supabase
      .from('timedeals')
      .select('id')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeTimedeal) {
      // 해당 상품들의 타임딜 할인율 조회
      const { data: timedealProducts } = await supabase
        .from('timedeal_products')
        .select('product_id, discount_percent')
        .eq('timedeal_id', activeTimedeal.id)
        .in('product_id', productIds)

      if (timedealProducts) {
        timedealProducts.forEach((tp: any) => {
          discountMap.set(tp.product_id, tp.discount_percent || 0)
        })
      }
    }
  } catch (error) {
    console.error('타임딜 할인율 조회 실패:', error)
  }

  return discountMap
}




