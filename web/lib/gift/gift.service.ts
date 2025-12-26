import { Product } from '@/lib/supabase/supabase'

export interface FetchGiftProductsResponse {
  products: Product[]
}

export async function fetchFeaturedGiftProducts(): Promise<FetchGiftProductsResponse> {
  const response = await fetch('/api/gift/featured')
  
  if (!response.ok) {
    console.error('[선물관] API 응답 실패:', response.status)
    return { products: [] }
  }
  
  const data = await response.json()
  return {
    products: (data.products || []) as Product[],
  }
}

export async function fetchTargetGiftProducts(targetSlug: string): Promise<FetchGiftProductsResponse> {
  const response = await fetch(`/api/gift/target/${targetSlug}`)
  
  if (!response.ok) {
    console.error('선물 대상 상품 조회 실패:', response.status)
    return { products: [] }
  }
  
  const data = await response.json()
  return {
    products: (data.products || []) as Product[],
  }
}

export async function fetchBudgetGiftProducts(budgetSlug: string): Promise<FetchGiftProductsResponse> {
  const response = await fetch(`/api/gift/budget/${budgetSlug}`)
  
  if (!response.ok) {
    console.error('예산별 상품 조회 실패:', response.status)
    return { products: [] }
  }
  
  const data = await response.json()
  return {
    products: (data.products || []) as Product[],
  }
}

