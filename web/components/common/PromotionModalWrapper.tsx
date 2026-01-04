'use client'

import { useState, useEffect } from 'react'
import { supabase, Product } from '@/lib/supabase/supabase'
import { usePromotionModalStore } from '@/lib/store'
import PromotionModal from '@/components/common/PromotionModal'

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
              is_active
            )
            )
          `)
          .eq('id', productId)
          .single()
        
        if (error) throw error
        
        // 활성화된 프로모션 찾기
        let activePromotion = null
        if (data.promotion_products && data.promotion_products.length > 0) {
          for (const pp of data.promotion_products) {
            const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
            if (promo && promo.is_active) {
              activePromotion = promo
              break
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

