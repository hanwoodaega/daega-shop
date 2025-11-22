'use client'

import { useState, useEffect } from 'react'
import { supabase, Product } from '@/lib/supabase'
import { usePromotionModalStore } from '@/lib/store'
import PromotionModal from './PromotionModal'

export default function PromotionModalWrapper() {
  const { isOpen, productId, closeModal } = usePromotionModalStore()
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setProduct(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            promotion_products (
              promotion_id,
              promotions (
                id,
                type,
                buy_qty,
                discount_percent,
                is_active,
                start_at,
                end_at
              )
            )
          `)
          .eq('id', productId)
          .single()
        
        if (error) throw error
        
        // 활성화된 프로모션 찾기
        let activePromotion = null
        if (data.promotion_products && data.promotion_products.length > 0) {
          const now = new Date()
          for (const pp of data.promotion_products) {
            const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
            if (promo && promo.is_active) {
              const startAt = promo.start_at ? new Date(promo.start_at) : null
              const endAt = promo.end_at ? new Date(promo.end_at) : null
              const isInDateRange = (!startAt || now >= startAt) && (!endAt || now <= endAt)
              
              if (isInDateRange) {
                activePromotion = promo
                break
              }
            }
          }
        }
        
        setProduct({
          ...data,
          promotion: activePromotion,
        })
      } catch (error) {
        console.error('상품 조회 실패:', error)
        setProduct(null)
      }
    }

    if (isOpen && productId) {
      fetchProduct()
    }
  }, [isOpen, productId])

  return (
    <PromotionModal
      isOpen={isOpen}
      onClose={closeModal}
      product={product}
    />
  )
}

