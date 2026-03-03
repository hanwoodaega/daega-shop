import { FetchProductsParams, FetchProductsResponse } from './product.types'
import { enrichProductsWithImages } from './product-image-utils'

/**
 * 기본 상품 select 필드 (프로모션 정보 포함)
 */
export const PRODUCT_SELECT_FIELDS = `
  id,
  slug,
  brand,
  name,
  price,
  category,
  average_rating,
  review_count,
  weight_gram,
  status,
  created_at,
  updated_at,
  promotion_products (
    promotion_id,
    promotions (
      id,
      type,
      buy_qty,
      discount_percent,
      is_active
    )
  )
`

/**
 * 간단한 상품 select 필드 (프로모션 정보 제외)
 */
export const SIMPLE_PRODUCT_SELECT_FIELDS = `
  id,
  slug,
  brand,
  name,
  price,
  category,
  average_rating,
  review_count,
  weight_gram,
  status
`

/**
 * 프로모션 정보 추출 (활성화된 프로모션만)
 */
export function extractActivePromotion(product: any): any | null {
  if (!product?.promotion_products || !Array.isArray(product.promotion_products) || product.promotion_products.length === 0) {
    return null
  }
  
  for (const pp of product.promotion_products) {
    const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
    
    if (promo && promo.is_active) {
      return promo
    }
  }
  
  return null
}

/**
 * 프로모션 타입 문자열 생성 (BOGO인 경우)
 */
export function getPromotionTypeString(promotion: any): '1+1' | '2+1' | '3+1' | undefined {
  if (promotion && promotion.type === 'bogo' && promotion.buy_qty) {
    return `${promotion.buy_qty}+1` as '1+1' | '2+1' | '3+1'
  }
  return undefined
}

/**
 * 프로모션 정보 추출 (단순 버전 - 날짜 체크 없음)
 */
export function extractPromotion(product: any): any | null {
  if (!product?.promotion_products || !Array.isArray(product.promotion_products) || product.promotion_products.length === 0) {
    return null
  }
  
  const pp = Array.isArray(product.promotion_products[0]) 
    ? product.promotion_products[0] 
    : product.promotion_products[0]
  
  return pp?.promotions || null
}

/**
 * 클라이언트 사이드에서 상품 데이터 보강 (프로모션 등)
 */
export async function enrichProducts(products: any[]): Promise<any[]> {
  if (!products || products.length === 0) {
    return []
  }

  return products.map((product: any) => {
    const activePromotion = extractActivePromotion(product)
    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: activePromotion,
    }
  })
}

/**
 * 서버 사이드에서 상품 데이터 보강 (프로모션, 이미지 등)
 * @param products 상품 배열
 * @param options 옵션 (filter 등)
 * @returns 보강된 상품 배열
 */
export async function enrichProductsServer(
  products: any[],
  options?: { filter?: string }
): Promise<any[]> {
  if (!products || products.length === 0) {
    return []
  }

  let productsWithImages = products
  try {
    productsWithImages = await enrichProductsWithImages(products)
  } catch (error: any) {
    console.error('이미지 보강 실패:', error)
    productsWithImages = products.map((product: any) => ({
      ...product,
      image_url: null
    }))
  }

  return productsWithImages.map((product: any) => {
    const promotion = extractActivePromotion(product)
    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: promotion,
    }
  })
}

/**
 * HTTP API를 통한 상품 목록 조회
 */
export async function fetchProducts(params: FetchProductsParams): Promise<FetchProductsResponse> {
  const {
    page = 1,
    limit = 20,
    sort = 'default',
    category,
    search,
    filter,
  } = params

  const urlParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sort === 'default' ? 'default' : sort,
  })

  if (search) {
    urlParams.append('search', search)
  } else if (filter) {
    urlParams.append('filter', filter)
  } else if (category && category !== '전체') {
    urlParams.append('category', category)
  }

  // 타임아웃 설정 (10초)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`/api/products?${urlParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('상품 조회 실패')
    }

    const data = await response.json()
    return {
      products: data.products || [],
      totalPages: data.totalPages || 0,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
    }
    throw error
  }
}

