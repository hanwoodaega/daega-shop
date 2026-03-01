/**
 * 최종 가격 결정 로직
 * 프로모션 할인율을 반영하여 최종 가격 결정
 */

import { calculatePromotionDiscount } from '../promotion/promotion.pricing'

export interface PricingInput {
  basePrice: number
  promotion?: {
    is_active?: boolean | null
    discount_percent?: number | null
  } | null
  weightGram?: number | null
}

export interface FinalPricing {
  basePrice: number
  discountPercent: number
  finalPrice: number
  pricePer100g: number | null
  weightGram?: number | null
}

/**
 * 최종 가격 결정 (프로모션 할인만 적용)
 */
export function getFinalPricing(input: PricingInput): FinalPricing {
  const { basePrice, promotion, weightGram } = input

  const promotionDiscount = calculatePromotionDiscount(promotion)
  const finalDiscountPercent = promotionDiscount

  const finalPrice = finalDiscountPercent > 0
    ? Math.round(basePrice * (100 - finalDiscountPercent) / 100)
    : basePrice

  const pricePer100g = weightGram && weightGram > 0
    ? (finalPrice / weightGram) * 100
    : null

  return {
    basePrice,
    discountPercent: finalDiscountPercent,
    finalPrice,
    pricePer100g,
    weightGram,
  }
}

