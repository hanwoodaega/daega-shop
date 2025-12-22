/**
 * 프로모션 관련 유틸리티 함수
 */

import { Product } from '../supabase/supabase'
import { CartItem } from '../store'

/**
 * 프로모션 그룹 ID 생성
 */
export function generatePromotionGroupId(): string {
  return `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 프로모션 상품을 가격 순으로 정렬하고 무료 상품 결정
 * @param items 선택된 프로모션 상품 목록
 * @param paidCount 유료로 구매해야 할 개수 (예: 2+1이면 2)
 * @returns 각 상품의 할인율이 적용된 CartItem 배열
 */
export function processPromotionItems(
  items: { product: Product; quantity: number }[],
  paidCount: number
): Omit<CartItem, 'id' | 'selected'>[] {
  // 가격 순 정렬 (낮은 가격 → 높은 가격) - 가장 저렴한 상품이 무료가 되도록
  const sortedItems = [...items].sort((a, b) => a.product.price - b.product.price)
  
  const cartItems: Omit<CartItem, 'id' | 'selected'>[] = []
  let remaining = paidCount
  
  sortedItems.forEach(({ product, quantity }) => {
    for (let i = 0; i < quantity; i++) {
      const isFree = remaining <= 0
      cartItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.image_url,
        // 무료 상품은 100% 할인, 유료 상품은 할인 없음
        discount_percent: isFree ? 100 : undefined,
        brand: product.brand ?? undefined,
      })
      remaining--
    }
  })
  
  return cartItems
}

/**
 * 프로모션 그룹의 할인율 결정
 * 프로모션 그룹이 있으면 장바구니의 discount_percent 우선 (무료 상품 보호)
 * 일반 상품은 상품의 discount_percent 우선
 */
export function getDiscountPercent(
  itemDiscountPercent: number | null | undefined,
  productDiscountPercent: number | null | undefined,
  hasPromotionGroup: boolean
): number | undefined {
  if (hasPromotionGroup) {
    // 프로모션 그룹: 장바구니의 discount_percent 우선 (무료 상품 100% 할인 보호)
    return itemDiscountPercent ?? productDiscountPercent ?? undefined
  } else {
    // 일반 상품: 상품의 discount_percent 우선
    return productDiscountPercent ?? itemDiscountPercent ?? undefined
  }
}

