/**
 * 타임딜 할인율 계산 로직
 */

/**
 * 타임딜 할인율 계산
 * @param timedealDiscountPercent 타임딜 할인율 (0-100)
 * @returns 할인율 (없으면 0)
 */
export function calculateTimedealDiscount(timedealDiscountPercent: number | null | undefined): number {
  if (!timedealDiscountPercent || timedealDiscountPercent <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, timedealDiscountPercent))
}

