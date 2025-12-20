'use client'

import { useState, useEffect, useCallback } from 'react'

export function usePromotedProducts() {
  const [promotedProductIds, setPromotedProductIds] = useState<Set<string>>(new Set())

  const fetchPromotedProducts = useCallback(async () => {
    try {
      // 모든 프로모션 조회
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()

      if (res.ok && data.promotions) {
        const productIds = new Set<string>()

        // 각 프로모션의 상품 조회
        for (const promotion of data.promotions) {
          try {
            const detailRes = await fetch(`/api/admin/promotions/${promotion.id}`)
            const detailData = await detailRes.json()
            if (detailRes.ok && detailData.products) {
              detailData.products.forEach((pp: any) => {
                productIds.add(pp.product_id)
              })
            }
          } catch (error) {
            console.error(`프로모션 ${promotion.id} 상품 조회 실패:`, error)
          }
        }

        setPromotedProductIds(productIds)
      }
    } catch (error) {
      console.error('프로모션 상품 조회 실패:', error)
    }
  }, [])

  useEffect(() => {
    fetchPromotedProducts()
  }, [fetchPromotedProducts])

  return {
    promotedProductIds,
    refetch: fetchPromotedProducts,
  }
}

