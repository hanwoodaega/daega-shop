/**
 * 최종 가격 결정 로직
 * 타임딜과 프로모션 할인율을 조합하여 최종 가격 결정
 */

import { calculateTimedealDiscount } from '../timedeal/timedeal.pricing'
import { calculatePromotionDiscount } from '../promotion/promotion.pricing'

export interface PricingInput {
  basePrice: number
  timedealDiscountPercent?: number | null
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
 * 최종 가격 결정
 * 우선순위: 타임딜 > 프로모션
 * @param input 가격 계산 입력값
 * @returns 최종 가격 정보
 */
export function getFinalPricing(input: PricingInput): FinalPricing {
  const { basePrice, timedealDiscountPercent, promotion, weightGram } = input

  // 타임딜 할인율 계산
  const timedealDiscount = calculateTimedealDiscount(timedealDiscountPercent)
  
  // 프로모션 할인율 계산
  const promotionDiscount = calculatePromotionDiscount(promotion)
  
  // 최종 할인율 결정 (타임딜 우선)
  const finalDiscountPercent = timedealDiscount > 0 ? timedealDiscount : promotionDiscount
  
  // 최종 가격 계산
  const finalPrice = finalDiscountPercent > 0
    ? Math.round(basePrice * (100 - finalDiscountPercent) / 100)
    : basePrice
  
  // 100g당 가격 계산
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

