'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { TimeDeal, TimeDealProduct } from '../_types'

export function useTimeDealProducts(selectedTimeDeal: TimeDeal | null) {
  const [timeDealProducts, setTimeDealProducts] = useState<TimeDealProduct[]>([])

  const fetchTimeDealProducts = useCallback(async (timeDealId: number) => {
    try {
      const res = await fetch('/api/admin/timedeals')
      const data = await res.json()
      if (res.ok) {
        const timeDeal = data.timedeals?.find((td: TimeDeal) => td.id === timeDealId)
        if (timeDeal) {
          setTimeDealProducts(timeDeal.products || [])
        }
      }
    } catch (error) {
      console.error('타임딜 상품 조회 실패:', error)
    }
  }, [])

  useEffect(() => {
    if (selectedTimeDeal) {
      fetchTimeDealProducts(selectedTimeDeal.id)
    } else {
      setTimeDealProducts([])
    }
  }, [selectedTimeDeal, fetchTimeDealProducts])

  const handleAddProducts = useCallback(
    async (timeDealId: number, products: Array<{ product_id: string; discount_percent: number; sort_order: number }>) => {
      if (products.length === 0) {
        toast.error('상품을 선택하세요')
        return false
      }

      try {
        // 기존 상품들
        const existingProducts = timeDealProducts.map((tp) => ({
          product_id: tp.product_id,
          discount_percent: tp.discount_percent,
          sort_order: tp.sort_order,
        }))

        // 새로 선택한 상품들
        const newProducts = products.map((p, index) => ({
          product_id: p.product_id,
          discount_percent: p.discount_percent,
          sort_order: existingProducts.length + index,
        }))

        // 기존 상품과 새 상품 합치기
        const allProducts = [...existingProducts, ...newProducts]

        const res = await fetch('/api/admin/timedeals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: timeDealId,
            products: allProducts,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          toast.success('상품이 추가되었습니다')
          await fetchTimeDealProducts(timeDealId)
          return true
        } else {
          toast.error(data.error || '상품 추가에 실패했습니다')
          return false
        }
      } catch (error) {
        console.error('상품 추가 실패:', error)
        toast.error('상품 추가에 실패했습니다')
        return false
      }
    },
    [timeDealProducts, fetchTimeDealProducts]
  )

  const handleRemoveProduct = useCallback(
    async (timeDealId: number, productId: string) => {
      if (!confirm('이 상품을 타임딜에서 제거하시겠습니까?')) return false

      try {
        // 기존 상품 목록에서 해당 상품 제거
        const updatedProducts = timeDealProducts
          .filter((tp) => tp.product_id !== productId)
          .map((tp, index) => ({
            product_id: tp.product_id,
            discount_percent: tp.discount_percent,
            sort_order: index,
          }))

        const res = await fetch('/api/admin/timedeals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: timeDealId,
            products: updatedProducts,
          }),
        })

        if (res.ok) {
          toast.success('상품이 제거되었습니다')
          await fetchTimeDealProducts(timeDealId)
          return true
        } else {
          const data = await res.json()
          toast.error(data.error || '상품 제거에 실패했습니다')
          return false
        }
      } catch (error) {
        console.error('상품 제거 실패:', error)
        toast.error('상품 제거에 실패했습니다')
        return false
      }
    },
    [timeDealProducts, fetchTimeDealProducts]
  )

  const handleUpdateProductDiscount = useCallback(
    async (timeDealId: number, productId: string, discountPercent: number, sortOrder: number) => {
      try {
        const updatedProducts = timeDealProducts.map((tp) => {
          if (tp.product_id === productId) {
            return {
              product_id: tp.product_id,
              discount_percent: discountPercent,
              sort_order: sortOrder,
            }
          }
          return {
            product_id: tp.product_id,
            discount_percent: tp.discount_percent,
            sort_order: tp.sort_order,
          }
        })

        const res = await fetch('/api/admin/timedeals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: timeDealId,
            products: updatedProducts,
          }),
        })

        if (res.ok) {
          toast.success('상품 정보가 업데이트되었습니다')
          await fetchTimeDealProducts(timeDealId)
          return true
        } else {
          const data = await res.json()
          toast.error(data.error || '상품 정보 업데이트에 실패했습니다')
          return false
        }
      } catch (error) {
        console.error('상품 정보 업데이트 실패:', error)
        toast.error('상품 정보 업데이트에 실패했습니다')
        return false
      }
    },
    [timeDealProducts, fetchTimeDealProducts]
  )

  return {
    timeDealProducts,
    handleAddProducts,
    handleRemoveProduct,
    handleUpdateProductDiscount,
    refetch: selectedTimeDeal ? () => fetchTimeDealProducts(selectedTimeDeal.id) : undefined,
  }
}

