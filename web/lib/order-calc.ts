// 주문 금액 계산 유틸리티
import { CartItem } from './store'
import { SHIPPING } from './constants'

export interface OrderCalculation {
  originalTotal: number
  discountedTotal: number
  discountAmount: number
  shipping: number
  total: number
}

/**
 * 주문 금액 계산 (장바구니/체크아웃 공통)
 */
export function calculateOrderTotal(
  items: CartItem[],
  deliveryMethod: 'pickup' | 'quick' | 'regular' = 'regular'
): OrderCalculation {
  let originalTotal = 0
  let discountedTotal = 0

  // 상품 금액 계산
  items.forEach(item => {
    const originalPrice = item.price * item.quantity
    const discountedPrice = item.discount_percent && item.discount_percent > 0
      ? Math.round(item.price * (100 - item.discount_percent) / 100) * item.quantity
      : originalPrice
    
    originalTotal += originalPrice
    discountedTotal += discountedPrice
  })

  const discountAmount = originalTotal - discountedTotal

  // 배송비 계산
  const shipping = calculateShipping(discountedTotal, deliveryMethod)

  // 최종 합계
  const total = discountedTotal + shipping

  return {
    originalTotal,
    discountedTotal,
    discountAmount,
    shipping,
    total
  }
}

/**
 * 배송비 계산
 */
export function calculateShipping(
  subtotal: number,
  deliveryMethod: 'pickup' | 'quick' | 'regular' = 'regular'
): number {
  // 픽업 - 무료
  if (deliveryMethod === 'pickup') {
    return 0
  }

  // 퀵배송 - 고정 요금
  if (deliveryMethod === 'quick') {
    return SHIPPING.QUICK_FEE
  }

  // 택배배송 - 금액에 따라
  if (subtotal >= SHIPPING.FREE_THRESHOLD) {
    return 0
  }
  return SHIPPING.DEFAULT_FEE
}

