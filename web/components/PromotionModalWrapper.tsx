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
          .select('*')
          .eq('id', productId)
          .single()
        
        if (error) throw error
        setProduct(data)
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

