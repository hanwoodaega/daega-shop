'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/lib/supabase/supabase'
import toast from 'react-hot-toast'

export interface UseProductDetailReturn {
  product: Product | null
  loading: boolean
  refetch: () => Promise<void>
}

export function useProductDetail(productId: string): UseProductDetailReturn {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true)
      
      // 타임아웃 설정 (5초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      try {
        // API 라우트를 통해 서버 사이드에서 조회
        const response = await fetch(`/api/products/${productId}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '상품을 찾을 수 없습니다.')
        }
        
        const enrichedProduct = await response.json()
        setProduct(enrichedProduct)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다.')
        }
        throw fetchError
      }
    } catch (error: any) {
      toast.error(error?.message || '상품을 불러오는 데 실패했습니다.')
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  return {
    product,
    loading,
    refetch: fetchProduct,
  }
}

