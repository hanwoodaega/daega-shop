// 주문 금액 계산 유틸리티 (클라이언트는 할인 계산하지 않음 — 서버 결과만 표시)
import { SHIPPING } from '../utils/constants'

/**
 * 배송비 계산.
 * 서버 order-pricing.server.ts에서도 사용. 할인/금액 규칙은 서버 한 군데만 유지.
 */
export function calculateShipping(
  subtotal: number,
  deliveryMethod: 'pickup' | 'regular' = 'regular'
): number {
  if (deliveryMethod === 'pickup') {
    return 0
  }
  if (subtotal >= SHIPPING.FREE_THRESHOLD) {
    return 0
  }
  return SHIPPING.DEFAULT_FEE
}
