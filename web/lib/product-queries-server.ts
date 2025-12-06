/**
 * 서버 사이드 전용 상품 관련 유틸리티
 * 클라이언트 번들에 포함되지 않도록 별도 파일로 분리
 */

import { extractActivePromotion } from './product-queries'
import { getTimedealDiscountPercentMap } from './timedeal-utils'

/**
 * 서버 사이드에서 상품 데이터 보강 (프로모션, 타임딜 할인율 등)
 * @param products 상품 배열
 * @param timedealDiscountMap 타임딜 할인율 맵 (선택사항, 없으면 조회)
 * @param options 옵션 (filter 등)
 * @returns 보강된 상품 배열
 */
export async function enrichProductsServer(
  products: any[],
  timedealDiscountMap?: Map<string, number>,
  options?: { filter?: string }
): Promise<any[]> {
  if (!products || products.length === 0) {
    return []
  }

  // 타임딜 할인율 맵이 없으면 조회 (서버 사이드 함수 사용)
  let discountMap = timedealDiscountMap
  if (!discountMap) {
    const productIds = products.map((p: any) => p.id)
    discountMap = await getTimedealDiscountPercentMap(productIds)
  }

  // 상품 데이터 보강
  return products.map((product: any) => {
    // 활성화된 프로모션만 반환
    const promotion = extractActivePromotion(product)

    // 타임딜 할인율 조회
    const timedealDiscountPercent = discountMap?.get(product.id) || 0

    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: promotion,
      timedeal_discount_percent: timedealDiscountPercent,
    }
  })
}

