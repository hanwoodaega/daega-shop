'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { RecommendationProduct, SelectedProduct } from '../_types'

export function useRecommendationProducts(selectedCategoryId: string | null) {
  const [categoryProducts, setCategoryProducts] = useState<RecommendationProduct[]>([])

  const fetchCategoryProducts = useCallback(async (categoryId: string) => {
    try {
      const res = await fetch(`/api/admin/recommendations/${categoryId}/products`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setCategoryProducts(data.products || [])
    } catch (error) {
      console.error('추천 상품 조회 실패:', error)
      setCategoryProducts([])
    }
  }, [])

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryProducts(selectedCategoryId)
    } else {
      setCategoryProducts([])
    }
  }, [selectedCategoryId, fetchCategoryProducts])

  const handleAddProducts = useCallback(async (categoryId: string, products: SelectedProduct[]) => {
    if (products.length === 0) {
      toast.error('상품을 선택하세요', { duration: 3000 })
      return false
    }

    try {
      const res = await fetch(`/api/admin/recommendations/${categoryId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다', { duration: 2000 })
        await fetchCategoryProducts(categoryId)
        return true
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다', { duration: 3000 })
        return false
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다', { duration: 3000 })
      return false
    }
  }, [fetchCategoryProducts])

  const handleRemoveProduct = useCallback(async (categoryId: string, productId: string) => {
    if (!confirm('이 상품을 카테고리에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/recommendations/${categoryId}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다', { duration: 2000 })
        await fetchCategoryProducts(categoryId)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다', { duration: 3000 })
    }
  }, [fetchCategoryProducts])

  const handleUpdateSortOrder = useCallback(async (categoryId: string, productId: string, sortOrder: number) => {
    try {
      const res = await fetch(
        `/api/admin/recommendations/${categoryId}/products/${productId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: sortOrder }),
        }
      )
      if (res.ok) {
        toast.success('순서가 변경되었습니다')
        await fetchCategoryProducts(categoryId)
      } else {
        const data = await res.json()
        toast.error(data.error || '순서 변경 실패', { duration: 3000 })
      }
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다', { duration: 3000 })
    }
  }, [fetchCategoryProducts])

  return {
    categoryProducts,
    handleAddProducts,
    handleRemoveProduct,
    handleUpdateSortOrder,
    refetch: selectedCategoryId ? () => fetchCategoryProducts(selectedCategoryId) : undefined,
  }
}

