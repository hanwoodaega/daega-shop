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
  review_count
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



