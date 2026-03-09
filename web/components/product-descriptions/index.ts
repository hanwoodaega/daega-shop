// 상품 설명 컴포넌트 매핑
// 각 상품 slug에 해당하는 설명 컴포넌트를 동적으로 로드

import { ComponentType } from 'react'

// 상품 설명 컴포넌트 타입
export type ProductDescriptionComponent = ComponentType<{ productId: string; productName?: string }>

/**
 * 상품 이름을 slug로 변환합니다.
 * 예: "한우대가No.9 프리미엄 세트" → "hanwoo-daega-no9-premium-set"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-')      // 공백을 하이픈으로
    .replace(/-+/g, '-')       // 연속된 하이픈을 하나로
    .trim()
    .replace(/^-+|-+$/g, '')  // 앞뒤 하이픈 제거
}

/**
 * 상품 설명 컴포넌트 매핑
 * 상품 slug를 키로 사용하여 해당하는 설명 컴포넌트를 반환
 * 
 * 사용 예시:
 * 'hanwoo-daega-no9-premium': () => import('./ProductDescription-hanwoo-daega-no9-premium'),
 * 'premium-beef-set': () => import('./ProductDescription-premium-beef-set'),
 */
const productDescriptionMap: Record<string, () => Promise<{ default: ProductDescriptionComponent }>> = {
  'harim-breast-blackpepper': () => import('./ProductDescription-harim-breast-blackpepper'),
  // 예시:
  // 'hanwoo-daega-no9-premium': () => import('./ProductDescription-hanwoo-daega-no9-premium'),
  // 'premium-beef-set': () => import('./ProductDescription-premium-beef-set'),
}

/**
 * 상품 slug 또는 이름으로 설명 컴포넌트를 가져옵니다.
 * @param productSlugOrName 상품 slug 또는 상품 이름
 * @param productId 상품 ID (전달용)
 * @returns 설명 컴포넌트 또는 null
 */
export async function getProductDescription(
  productSlugOrName: string,
  productId: string
): Promise<ProductDescriptionComponent | null> {
  // 먼저 slug로 직접 찾기
  let loader = productDescriptionMap[productSlugOrName]
  
  // 없으면 이름을 slug로 변환해서 찾기
  if (!loader) {
    const slug = nameToSlug(productSlugOrName)
    loader = productDescriptionMap[slug]
  }
  
  if (!loader) {
    return null
  }
  
  try {
    const module = await loader()
    return module.default
  } catch (error) {
    console.error(`Failed to load product description for ${productSlugOrName}:`, error)
    return null
  }
}

/**
 * 상품 설명이 존재하는지 확인합니다.
 * @param productName 상품 이름
 */
export function hasProductDescription(productName: string): boolean {
  const slug = nameToSlug(productName)
  return slug in productDescriptionMap
}

