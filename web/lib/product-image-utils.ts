/**
 * 상품 이미지 관련 유틸리티 함수
 */

import { createSupabaseServerClient } from './supabase-server'

/**
 * 상품에 대한 우선순위가 가장 높은 이미지 URL 조회
 * @param productId 상품 ID
 * @param fallbackImageUrl 기본 이미지 URL (product_images가 없을 때 사용)
 * @returns 이미지 URL
 */
export async function getProductMainImageUrl(
  productId: string,
  fallbackImageUrl?: string | null
): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.error('상품 이미지 조회 실패:', error)
      return fallbackImageUrl || null
    }
    
    return data?.image_url || fallbackImageUrl || null
  } catch (error: any) {
    console.error('상품 이미지 조회 에러:', error)
    return fallbackImageUrl || null
  }
}

/**
 * 여러 상품에 대한 우선순위가 가장 높은 이미지 URL 맵 조회
 * @param productIds 상품 ID 배열
 * @returns 상품 ID -> 이미지 URL 맵
 */
export async function getProductMainImageUrlMap(
  productIds: string[]
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>()
  
  if (productIds.length === 0) {
    return imageMap
  }
  
  try {
    const supabase = createSupabaseServerClient()
    
    // 각 상품의 우선순위가 가장 높은 이미지 조회
    // Supabase에서는 서브쿼리가 제한적이므로, 각 상품에 대해 조회
    // 성능 최적화를 위해 한 번에 조회 후 그룹화
    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url, priority')
      .in('product_id', productIds)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('상품 이미지 목록 조회 실패:', error)
      return imageMap
    }
    
    // 각 상품별로 우선순위가 가장 높은 이미지 선택
    const imageMapByProduct = new Map<string, { image_url: string; priority: number }>()
    
    if (data) {
      for (const img of data) {
        const existing = imageMapByProduct.get(img.product_id)
        if (!existing || img.priority < existing.priority) {
          imageMapByProduct.set(img.product_id, {
            image_url: img.image_url,
            priority: img.priority
          })
        }
      }
    }
    
    // 맵 생성
    for (const productId of productIds) {
      const img = imageMapByProduct.get(productId)
      imageMap.set(productId, img?.image_url || null)
    }
  } catch (error: any) {
    console.error('상품 이미지 맵 조회 에러:', error)
  }
  
  return imageMap
}

/**
 * 상품 배열에 이미지 URL 보강 (product_images 우선순위가 가장 높은 이미지 사용)
 * @param products 상품 배열
 * @returns 이미지 URL이 보강된 상품 배열
 */
export async function enrichProductsWithImages(products: any[]): Promise<any[]> {
  if (!products || products.length === 0) {
    return products
  }
  
  try {
    const productIds = products.map((p: any) => p.id)
    const imageMap = await getProductMainImageUrlMap(productIds)
    
    return products.map((product: any) => {
      const mainImageUrl = imageMap.get(product.id)
      return {
        ...product,
        image_url: mainImageUrl || null
      }
    })
  } catch (error) {
    // 에러가 발생해도 상품 목록은 반환 (이미지 없이)
    console.error('이미지 보강 실패:', error)
    return products.map((product: any) => ({
      ...product,
      image_url: null
    }))
  }
}

