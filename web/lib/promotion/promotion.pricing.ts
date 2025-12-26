/**
 * 프로모션 할인율 계산 로직
 */

/**
 * 프로모션 할인율 계산
 * @param promotion 프로모션 객체 (is_active, discount_percent 포함)
 * @returns 할인율 (없으면 0)
 */
export function calculatePromotionDiscount(promotion: {
  is_active?: boolean | null
  discount_percent?: number | null
} | null | undefined): number {
  if (!promotion?.is_active) {
    return 0
  }
  
  const discountPercent = promotion.discount_percent
  if (!discountPercent || discountPercent <= 0) {
    return 0
  }
  
  return Math.min(100, Math.max(0, discountPercent))
}

