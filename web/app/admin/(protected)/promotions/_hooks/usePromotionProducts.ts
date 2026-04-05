import { useState, useEffect, useCallback } from 'react'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { Promotion, PromotionProduct } from '../_types'

export function usePromotionProducts(promotions: Promotion[]) {
  const [promotionProductsMap, setPromotionProductsMap] = useState<Map<string, PromotionProduct[]>>(new Map())
  const [promotedProductIds, setPromotedProductIds] = useState<Set<string>>(new Set())

  const fetchPromotionProducts = useCallback(async (promotionId: string) => {
    try {
      const detailRes = await adminApiFetch(`/api/admin/promotions/${promotionId}`)
      const detailData = await detailRes.json()
      if (detailRes.ok && detailData.products) {
        return detailData.products as PromotionProduct[]
      }
    } catch (error) {
      console.error(`프로모션 ${promotionId} 상품 조회 실패:`, error)
    }
    return []
  }, [])

  const fetchAllPromotionProducts = useCallback(async () => {
    const productsMap = new Map<string, PromotionProduct[]>()
    
    for (const promotion of promotions) {
      const products = await fetchPromotionProducts(promotion.id)
      if (products.length > 0) {
        productsMap.set(promotion.id, products)
      }
    }
    
    setPromotionProductsMap(productsMap)
  }, [promotions, fetchPromotionProducts])

  const fetchPromotedProductIds = useCallback(async () => {
    try {
      const res = await adminApiFetch('/api/admin/promotions')
      const data = await res.json()
      if (res.ok && data.promotions) {
        const productIds = new Set<string>()
        
        // 각 활성 프로모션의 상품 ID 수집
        for (const promotion of data.promotions) {
          if (promotion.is_active) {
            const products = await fetchPromotionProducts(promotion.id)
            products.forEach((pp) => {
              productIds.add(pp.product_id)
            })
          }
        }
        
        setPromotedProductIds(productIds)
      }
    } catch (error) {
      console.error('프로모션 상품 조회 실패:', error)
    }
  }, [fetchPromotionProducts])

  useEffect(() => {
    if (promotions.length > 0) {
      fetchAllPromotionProducts()
      fetchPromotedProductIds()
    }
  }, [promotions, fetchAllPromotionProducts, fetchPromotedProductIds])

  return {
    promotionProductsMap,
    promotedProductIds,
    fetchPromotionProducts,
    refetch: fetchAllPromotionProducts,
  }
}

