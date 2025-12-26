'use client'

import { useState, useEffect, useRef } from 'react'

export interface UseProductReviewsReturn {
  reviewCount: number
  averageRating: number
  refetch: () => Promise<void>
}

export function useProductReviews(productId: string | null): UseProductReviewsReturn {
  const [reviewCount, setReviewCount] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const isFetchingRef = useRef(false)

  const fetchReviewCount = async () => {
    if (!productId) return
    
    // 중복 호출 방지
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    try {
      const response = await fetch(`/api/reviews?productId=${productId}&page=1&limit=3`)
      if (response.ok) {
        const data = await response.json()
        setReviewCount(data.total || 0)
        if (typeof data.averageApprovedRating === 'number') {
          setAverageRating(data.averageApprovedRating || 0)
        }
      }
    } catch (error) {
      console.error('리뷰 개수 조회 실패:', error)
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    if (productId) {
      fetchReviewCount()
    }
  }, [productId])

  return {
    reviewCount,
    averageRating,
    refetch: fetchReviewCount,
  }
}

