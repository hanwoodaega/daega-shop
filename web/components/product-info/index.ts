// 상품고시정보 컴포넌트 매핑
// 각 상품 slug에 해당하는 상품고시정보 컴포넌트를 동적으로 로드

import { ComponentType } from 'react'

// 상품고시정보 컴포넌트 타입
export type ProductInfoComponent = ComponentType<{ productId: string; productName?: string }>

/**
 * 상품 설명 컴포넌트 매핑
 * 상품 slug를 키로 사용하여 해당하는 상품고시정보 컴포넌트를 반환
 * 
 * 사용 예시:
 * 'harim-breast-blackpepper': () => import('./ProductInfo-harim-breast-blackpepper'),
 * 'hanwoo-daega-no9-premium': () => import('./ProductInfo-hanwoo-daega-no9-premium'),
 */
const productInfoMap: Record<string, () => Promise<{ default: ProductInfoComponent }>> = {
  'harim-breast-blackpepper': () => import('./ProductInfo-harim-breast-blackpepper'),
  // 예시:
  // 'hanwoo-daega-no9-premium': () => import('./ProductInfo-hanwoo-daega-no9-premium'),
}

/**
 * 상품 slug 또는 이름으로 상품고시정보 컴포넌트를 가져옵니다.
 * @param productSlugOrName 상품 slug 또는 상품 이름
 * @param productId 상품 ID (전달용)
 * @returns 상품고시정보 컴포넌트 또는 null
 */
export async function getProductInfo(
  productSlugOrName: string,
  productId: string
): Promise<ProductInfoComponent | null> {
  // 먼저 slug로 직접 찾기
  let loader = productInfoMap[productSlugOrName]
  
  if (!loader) {
    return null
  }
  
  try {
    const module = await loader()
    return module.default
  } catch (error) {
    console.error(`Failed to load product info for ${productSlugOrName}:`, error)
    return null
  }
}

/**
 * 상품고시정보가 존재하는지 확인합니다.
 * @param productSlugOrName 상품 slug 또는 상품 이름
 */
export function hasProductInfo(productSlugOrName: string): boolean {
  return productSlugOrName in productInfoMap
}

