/**
 * 카테고리 관련 유틸리티 함수
 */

import { CATEGORIES } from './constants'

// 카테고리명 -> slug 매핑
const CATEGORY_TO_SLUG: Record<string, string> = {
  '한우': 'hanwoo',
  '한돈': 'handon',
  '수입육': 'imported',
  '닭·오리': 'chicken',
  '가공육': 'processed',
  '양념육': 'seasoned',
  '과일·야채': 'vegetable',
  '선물세트': 'gift-set',
}

// slug -> 카테고리명 역매핑
const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_SLUG).map(([category, slug]) => [slug, category])
)

/**
 * 카테고리명을 slug로 변환
 */
export function categoryToSlug(category: string): string | null {
  if (category === '전체') return null
  return CATEGORY_TO_SLUG[category] || null
}

/**
 * slug를 카테고리명으로 변환
 */
export function slugToCategory(slug: string): string | null {
  return SLUG_TO_CATEGORY[slug] || null
}

/**
 * 유효한 카테고리 slug인지 확인
 */
export function isValidCategorySlug(slug: string): boolean {
  return slug in SLUG_TO_CATEGORY
}

/**
 * 카테고리 경로 생성
 */
export function getCategoryPath(category: string): string {
  if (category === '전체') return '/products'
  const slug = categoryToSlug(category)
  return slug ? `/products/${slug}` : '/products'
}

