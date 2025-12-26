import { FetchProductsParams, FetchProductsResponse } from './product.types'
import { getTimedealDiscountPercentMap } from '../timedeal/timedeal-utils'
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
 * 클라이언트 사이드에서 타임딜 할인율 맵 조회
 * @param productIds 상품 ID 배열
 * @returns 타임딜 할인율 맵
 */
async function fetchTimedealDiscountMap(productIds: string[]): Promise<Map<string, number>> {
  const discountMap = new Map<string, number>()
  
  if (productIds.length === 0) {
    return discountMap
  }

  try {
    // 동적 import로 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return discountMap
    }

    const { supabase } = await import('../supabase/supabase')
    const now = new Date().toISOString()
    
    // 타임아웃 설정 (1.5초)
    const timeoutPromise = new Promise<Map<string, number>>((resolve) => {
      setTimeout(() => resolve(discountMap), 1500)
    })
    
    const fetchPromise = (async () => {
      // 활성 타임딜 조회
      const { data: activeTimedeal, error: timedealError } = await supabase
        .from('timedeals')
        .select('id')
        .lte('start_at', now)
        .gte('end_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (timedealError || !activeTimedeal) {
        return discountMap
      }

      // 해당 상품들의 타임딜 할인율 조회
      const { data: timedealProducts, error: productsError } = await supabase
        .from('timedeal_products')
        .select('product_id, discount_percent')
        .eq('timedeal_id', activeTimedeal.id)
        .in('product_id', productIds)

      if (productsError || !timedealProducts) {
        return discountMap
      }

      timedealProducts.forEach((tp: any) => {
        discountMap.set(tp.product_id, tp.discount_percent || 0)
      })

      return discountMap
    })()

    return await Promise.race([fetchPromise, timeoutPromise])
  } catch (error) {
    console.error('타임딜 할인율 조회 실패:', error)
    return discountMap
  }
}

/**
 * 클라이언트 사이드에서 상품 데이터 보강 (프로모션, 타임딜 할인율 등)
 * @param products 상품 배열
 * @param timedealDiscountMap 타임딜 할인율 맵 (선택사항, 없으면 조회)
 * @returns 보강된 상품 배열
 */
export async function enrichProducts(
  products: any[],
  timedealDiscountMap?: Map<string, number>
): Promise<any[]> {
  if (!products || products.length === 0) {
    return []
  }

  // 타임딜 할인율 맵이 없으면 조회
  let discountMap = timedealDiscountMap
  if (!discountMap) {
    discountMap = await fetchTimedealDiscountMap(products.map((p: any) => p.id))
  }

  // 상품 데이터 보강
  return products.map((product: any) => {
    // 활성화된 프로모션 찾기
    const activePromotion = extractActivePromotion(product)

    // 타임딜 할인율 조회
    const timedealDiscountPercent = discountMap?.get(product.id) || 0

    return {
      ...product,
      average_rating: product.average_rating || 0,
      review_count: product.review_count || 0,
      promotion: activePromotion,
      timedeal_discount_percent: timedealDiscountPercent,
    }
  })
}

/**
 * 서버 사이드에서 상품 데이터 보강 (프로모션, 타임딜 할인율, 이미지 등)
 * 클라이언트 번들에 포함되지 않도록 주의
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

  // 이미지 보강 (product_images에서 우선순위가 가장 높은 이미지 사용)
  let productsWithImages = products
  try {
    productsWithImages = await enrichProductsWithImages(products)
  } catch (error: any) {
    // 이미지 보강 실패 시 원본 상품 반환 (이미지 없이)
    console.error('이미지 보강 실패:', error)
    productsWithImages = products.map((product: any) => ({
      ...product,
      image_url: null
    }))
  }

  // 상품 데이터 보강
  return productsWithImages.map((product: any) => {
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

