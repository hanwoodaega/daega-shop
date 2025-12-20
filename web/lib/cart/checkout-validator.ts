import { CartItem } from '@/lib/store'
import { calculateOrderTotal } from '@/lib/order-calc'
import { formatPrice } from '@/lib/utils'
import { GIFT_MIN_AMOUNT } from '@/lib/constants'

export type DeliveryMethod = 'pickup' | 'quick' | 'regular'

export interface CheckoutValidationInput {
  selectedItems: CartItem[]
  deliveryMethod: DeliveryMethod
  pickupTime?: string
  quickDeliveryArea?: string
  quickDeliveryTime?: string
  isGift?: boolean
}

export interface CheckoutValidationResult {
  valid: boolean
  error?: string
  errorIcon?: string
}

/**
 * 일반 주문 검증
 */
export function validateCheckout(input: CheckoutValidationInput): CheckoutValidationResult {
  const { selectedItems, deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime } = input

  // 상품 선택 검증
  if (selectedItems.length === 0) {
    return {
      valid: false,
      error: '주문할 상품을 선택해주세요.',
      errorIcon: '📦',
    }
  }

  // 배송 방법별 필수 입력 검증
  if (deliveryMethod === 'pickup' && !pickupTime) {
    return {
      valid: false,
      error: '픽업 시간을 선택해주세요.',
      errorIcon: '⏰',
    }
  }

  if (deliveryMethod === 'quick' && (!quickDeliveryArea || !quickDeliveryTime)) {
    return {
      valid: false,
      error: '배달 지역과 시간대를 선택해주세요.',
      errorIcon: '🚚',
    }
  }

  return { valid: true }
}

/**
 * 선물하기 주문 검증
 */
export function validateGiftCheckout(input: CheckoutValidationInput): CheckoutValidationResult {
  // 기본 검증 먼저 수행
  const basicValidation = validateCheckout(input)
  if (!basicValidation.valid) {
    return basicValidation
  }

  const { selectedItems, deliveryMethod } = input

  // 선물하기는 상품금액(즉시할인 적용 후)이 최소 금액 이상이어야 함 (배송비 제외)
  const { discountedTotal } = calculateOrderTotal(selectedItems, deliveryMethod)
  if (discountedTotal < GIFT_MIN_AMOUNT) {
    return {
      valid: false,
      error: `선물하기는 상품금액(할인 적용 후)이 ${formatPrice(GIFT_MIN_AMOUNT)}원 이상이어야 합니다.`,
      errorIcon: '🎁',
    }
  }

  return { valid: true }
}

