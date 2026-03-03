/**
 * Client Component에서 사용할 수 있는 상품 관련 함수들
 * Server 전용 코드를 포함하지 않음
 */

/**
 * 기본 상품 select 필드 (프로모션 정보 포함)
 * Client Component에서도 사용 가능
 */
export const PRODUCT_SELECT_FIELDS = `
  id,
  slug,
  brand,
  name,
  price,
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
      is_active
    )
  )
`

/**
 * 활성화된 프로모션 추출
 */
function extractActivePromotion(product: any): any | null {
  if (!product?.promotion_products || !Array.isArray(product.promotion_products) || product.promotion_products.length === 0) {
    return null
  }
  
  for (const pp of product.promotion_products) {
    const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
    
    if (promo && promo.is_active) {
      return promo
    }
  }
  
  return null
}

/**
 * Client 사이드에서 상품 데이터 보강 (프로모션만)
 * @param products 상품 배열
 * @returns 보강된 상품 배열
 */
export function enrichProducts(products: any[]): any[] {
  if (!products || products.length === 0) {
    return []
  }

  return products.map((product: any) => {
    const activePromotion = extractActivePromotion(product)

    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: activePromotion,
    }
  })
}

