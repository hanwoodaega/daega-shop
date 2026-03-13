/**
 * 주문 금액 계산 결과 타입.
 * 서버(calculateOrderPricing, /api/orders/price, /api/orders/draft)와
 * 클라이언트(체크아웃·장바구니 표시)에서 공통으로 사용.
 * 필드 추가/변경 시 한 곳만 수정하면 됨.
 */
export interface PricingResult {
  originalTotal: number
  discountedTotal: number
  shipping: number
  couponDiscount: number
  appliedPoints: number
  finalTotal: number
  /** 비과세 금액 합계 (토스 검증용) */
  taxFreeAmount: number
}

/**
 * 주문 금액 계산 시 각 상품 스냅샷.
 * API 응답 및 confirm 시 주문 저장에 사용.
 */
export interface OrderItemSnapshot {
  product_id: string
  product_name?: string
  quantity: number
  price: number
  final_unit_price: number
  promotion_group_id?: string | null
  /** 과세/비과세 구분 */
  tax_type?: 'taxable' | 'tax_free'
}

/** API 응답용 pricing 객체 생성 (appliedPoints/taxFreeAmount 기본값 통일) */
export function toPricingResponse(pricing: PricingResult): PricingResult {
  return {
    originalTotal: pricing.originalTotal,
    discountedTotal: pricing.discountedTotal,
    shipping: pricing.shipping,
    couponDiscount: pricing.couponDiscount,
    appliedPoints: pricing.appliedPoints ?? 0,
    finalTotal: pricing.finalTotal,
    taxFreeAmount: pricing.taxFreeAmount ?? 0,
  }
}
