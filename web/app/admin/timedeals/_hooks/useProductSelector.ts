'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Product, SelectedProductData, TimeDealProduct } from '../_types'

export function useProductSelector(existingProducts: TimeDealProduct[] = []) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProductData>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSelector, setShowProductSelector] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products?limit=1000')
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 이미 타임딜에 포함된 상품 ID
  const existingProductIds = new Set(existingProducts.map((tp) => tp.product_id))

  const toggleProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(productId)) {
        newMap.delete(productId)
      } else {
        newMap.set(productId, { discount_percent: 0, sort_order: newMap.size })
      }
      return newMap
    })
  }, [])

  const updateProductDiscount = useCallback((productId: string, discountPercent: number) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(productId)
      if (existing) {
        newMap.set(productId, { ...existing, discount_percent: discountPercent })
      }
      return newMap
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Map())
    setSearchQuery('')
  }, [])

  const openSelector = useCallback(() => {
    setShowProductSelector(true)
  }, [])

  const closeSelector = useCallback(() => {
    setShowProductSelector(false)
    clearSelection()
  }, [clearSelection])

  const getSelectedProductsArray = useCallback(() => {
    return Array.from(selectedProducts.entries()).map(([product_id, data]) => ({
      product_id,
      discount_percent: data.discount_percent,
      sort_order: data.sort_order,
    }))
  }, [selectedProducts])

  return {
    products: filteredProducts,
    selectedProducts,
    searchQuery,
    showProductSelector,
    existingProductIds,
    setSearchQuery,
    toggleProduct,
    updateProductDiscount,
    clearSelection,
    openSelector,
    closeSelector,
    getSelectedProductsArray,
  }
}

