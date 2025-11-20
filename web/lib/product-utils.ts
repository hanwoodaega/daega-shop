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
  if (product.is_best) tags.push('베스트')
  if (product.is_sale) tags.push('전단행사')
  return tags
}

/**
 * 상품 이미지 유효성 검사
 */
export function isValidImageUrl(imageUrl: string): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') return false
  const trimmed = imageUrl.trim()
  // placeholder 도메인은 유효 이미지로 취급하지 않음
  if (trimmed.includes('via.placeholder.com')) return false
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

/**
 * 타임딜 진행 중인지 확인
 */
export function isFlashSaleActive(product: Product): boolean {
  if (!product.flash_sale_end_time || !product.flash_sale_price) {
    return false
  }
  const now = new Date().getTime()
  const endTime = new Date(product.flash_sale_end_time).getTime()
  
  // 종료 시간이 지났으면 비활성화
  if (now >= endTime) {
    return false
  }
  
  // 시작 시간이 설정되어 있으면 시작 시간 체크
  if (product.flash_sale_start_time) {
    const startTime = new Date(product.flash_sale_start_time).getTime()
    return now >= startTime
  }
  
  // 시작 시간이 없으면 즉시 시작 (활성화)
  return true
}

/**
 * 타임딜 남은 시간 계산 (초 단위)
 */
export function getFlashSaleRemainingSeconds(product: Product): number | null {
  if (!product.flash_sale_end_time) {
    return null
  }
  const endTime = new Date(product.flash_sale_end_time).getTime()
  const now = new Date().getTime()
  const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
  return remaining > 0 ? remaining : null
}

/**
 * 타임딜 가격 가져오기 (활성화된 경우)
 */
export function getFlashSalePrice(product: Product): number | null {
  if (isFlashSaleActive(product) && product.flash_sale_price) {
    return product.flash_sale_price
  }
  return null
}




