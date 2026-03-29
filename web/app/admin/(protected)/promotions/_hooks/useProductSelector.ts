import { useState, useEffect, useCallback } from 'react'
import { Product } from '../_types'

export function useProductSelector() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
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

  const toggleProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }, [])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const clearSelection = useCallback(() => {
    setSelectedProducts([])
  }, [])

  const setSelection = useCallback((productIds: string[]) => {
    setSelectedProducts(productIds)
  }, [])

  return {
    products,
    selectedProducts,
    searchQuery,
    showProductSelector,
    filteredProducts,
    setSearchQuery,
    setShowProductSelector,
    toggleProduct,
    clearSelection,
    setSelection,
  }
}

