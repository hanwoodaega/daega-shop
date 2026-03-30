import { CartItem } from '@/lib/store'
import { formatPrice } from '@/lib/utils/utils'
import { GIFT_MIN_AMOUNT } from '@/lib/utils/constants'

export type DeliveryMethod = 'pickup' | 'regular'

export interface CheckoutValidationInput {
  selectedItems: CartItem[]
  deliveryMethod: DeliveryMethod
  pickupTime?: string
  isGift?: boolean
  /** 서버에서 받은 할인 적용 후 상품 금액. 있으면 이 값으로 선물 최소 금액 검사 */
  serverDiscountedTotal?: number
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
  const { selectedItems, deliveryMethod, pickupTime } = input

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

  return { valid: true }
}

/**
 * 선물하기 주문 검증
 */
export function validateGiftCheckout(input: CheckoutValidationInput): CheckoutValidationResult {
  const basicValidation = validateCheckout(input)
  if (!basicValidation.valid) {
    return basicValidation
  }

  const { serverDiscountedTotal } = input

  if (serverDiscountedTotal !== undefined && serverDiscountedTotal < GIFT_MIN_AMOUNT) {
    return {
      valid: false,
      error: `선물하기는 상품금액(할인 적용 후)이 ${formatPrice(GIFT_MIN_AMOUNT)}원 이상이어야 합니다.`,
      errorIcon: '🎁',
    }
  }

  return { valid: true }
}

