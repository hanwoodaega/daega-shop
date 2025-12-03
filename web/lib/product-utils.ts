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
 * 품절 여부 확인 (status 기반)
 */
export function isSoldOut(status?: string | null): boolean {
  return status === 'soldout'
}

/**
 * 삭제된 상품 여부 확인
 */
export function isDeleted(status?: string | null): boolean {
  return status === 'deleted'
}

/**
 * 판매 가능한 상품 여부 확인
 */
export function isActive(status?: string | null): boolean {
  return status === 'active'
}





