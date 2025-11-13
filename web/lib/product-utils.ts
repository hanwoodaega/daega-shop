// 상품 관련 유틸리티 함수

import { Product } from './supabase'

/**
 * 할인가 계산
 */
export function calculateDiscountPrice(price: number, discountPercent?: number | null): number {
  if (!discountPercent || discountPercent <= 0) {
    return price
  }
  return Math.round(price * (100 - discountPercent) / 100)
}

/**
 * 상품 필터 태그 배열 가져오기
 */
export function getProductTags(product: Product): string[] {
  const tags: string[] = []
  if (product.is_new) tags.push('신상품')
  if (product.is_best) tags.push('베스트')
  if (product.is_sale) tags.push('전단행사')
  if (product.is_budget) tags.push('알뜰상품')
  return tags
}

/**
 * 상품 이미지 유효성 검사
 */
export function isValidImageUrl(imageUrl: string): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') return false
  const trimmed = imageUrl.trim()
  return trimmed.length > 0 && 
    (trimmed.startsWith('http://') || 
     trimmed.startsWith('https://') || 
     trimmed.startsWith('/'))
}

/**
 * 품절 여부 확인
 */
export function isOutOfStock(stock: number): boolean {
  return stock <= 0
}




