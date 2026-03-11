// 주문 금액 계산 유틸리티
import { CartItem } from '../store'
import { SHIPPING } from '../utils/constants'

export interface OrderCalculation {
  originalTotal: number
  discountedTotal: number
  discountAmount: number
  shipping: number
  total: number
}

/** BOGO 타입에서 산 수량 (1+1 → 1, 2+1 → 2, 3+1 → 3) */
function getBuyQtyFromPromotionType(promotionType?: string): number {
  if (promotionType === '1+1') return 1
  if (promotionType === '2+1') return 2
  if (promotionType === '3+1') return 3
  return 1
}

/**
 * 주문 금액 계산 (장바구니/체크아웃 공통)
 * 즉시할인(discount_percent)과 BOGO(1+1·2+1·3+1)를 반영합니다.
 */
export function calculateOrderTotal(
  items: CartItem[],
  deliveryMethod: 'pickup' | 'quick' | 'regular' = 'regular'
): OrderCalculation {
  let originalTotal = 0
  let discountedTotal = 0

  const bogoGroups = new Map<string, CartItem[]>()
  const standaloneItems: CartItem[] = []

  items.forEach((item) => {
    const lineTotal = item.price * item.quantity
    originalTotal += lineTotal

    if (item.promotion_group_id && item.promotion_type) {
      const group = bogoGroups.get(item.promotion_group_id) || []
      group.push(item)
      bogoGroups.set(item.promotion_group_id, group)
    } else {
      const discountedPrice =
        item.discount_percent && item.discount_percent > 0
          ? Math.round((item.price * (100 - item.discount_percent)) / 100) * item.quantity
          : lineTotal
      discountedTotal += discountedPrice
    }
  })

  bogoGroups.forEach((groupItems) => {
    const promotionType = groupItems[0]?.promotion_type
    const buyQty = getBuyQtyFromPromotionType(promotionType)

    const unitEntries: Array<{ productId: string; price: number }> = []
    groupItems.forEach((item) => {
      for (let i = 0; i < item.quantity; i += 1) {
        unitEntries.push({ productId: item.productId, price: item.price })
      }
    })

    const freeCount = Math.floor(unitEntries.length / (buyQty + 1))
    unitEntries.sort((a, b) => a.price - b.price)
    const freeUnits = unitEntries.slice(0, freeCount)

    const freeCountByProduct = new Map<string, number>()
    freeUnits.forEach((unit) => {
      freeCountByProduct.set(unit.productId, (freeCountByProduct.get(unit.productId) || 0) + 1)
    })

    groupItems.forEach((item) => {
      const freeForProduct = freeCountByProduct.get(item.productId) || 0
      const paidQty = Math.max(0, item.quantity - freeForProduct)
      const paidTotal = paidQty * item.price
      discountedTotal += paidTotal
    })
  })

  const discountAmount = originalTotal - discountedTotal

  const shipping = calculateShipping(discountedTotal, deliveryMethod)

  const total = discountedTotal + shipping

  return {
    originalTotal,
    discountedTotal,
    discountAmount,
    shipping,
    total,
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

