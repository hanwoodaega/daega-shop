'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import type { Product, SelectedProduct, RecommendationProduct } from '../_types'

export function useProductSelector(existingProducts: RecommendationProduct[] = []) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSelector, setShowProductSelector] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await adminApiFetch('/api/admin/products?limit=1000')
      const data = await res.json()
      if (res.ok) {
        setProducts(data.items || [])
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      p.category.toLowerCase().includes(query)
    )
  })

  // 이미 카테고리에 포함된 상품 제외
  const availableProducts = filteredProducts.filter(
    (p) => !existingProducts.some((rp) => rp.product_id === p.id)
  )

  const toggleProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((sp) => sp.product_id === productId)
      if (existing) {
        return prev.filter((sp) => sp.product_id !== productId)
      } else {
        return [...prev, { product_id: productId, sort_order: 0 }]
      }
    })
  }, [])

  const updateProductSortOrder = useCallback((productId: string, sortOrder: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp) =>
        sp.product_id === productId ? { ...sp, sort_order: sortOrder } : sp
      )
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedProducts([])
    setSearchQuery('')
  }, [])

  const openSelector = useCallback(() => {
    setShowProductSelector(true)
  }, [])

  const closeSelector = useCallback(() => {
    setShowProductSelector(false)
    clearSelection()
  }, [clearSelection])

  return {
    products,
    selectedProducts,
    searchQuery,
    showProductSelector,
    availableProducts,
    setSearchQuery,
    toggleProduct,
    updateProductSortOrder,
    clearSelection,
    openSelector,
    closeSelector,
  }
}

