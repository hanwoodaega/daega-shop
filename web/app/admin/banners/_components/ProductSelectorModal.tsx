'use client'

import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils/utils'
import type { Product } from '../_types'

interface ProductSelectorModalProps {
  bannerId: string
  existingProductIds: string[]
  initialProducts: Product[]
  onClose: () => void
  onSuccess: () => void
}

export default function ProductSelectorModal({
  bannerId,
  existingProductIds,
  initialProducts,
  onClose,
  onSuccess,
}: ProductSelectorModalProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(initialProducts.length === 0)

  // 초기 상품이 없으면 가져오기
  useEffect(() => {
    if (initialProducts.length > 0) {
      setLoading(false)
      return
    }

    fetch('/api/admin/products?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setProducts(data.items)
        }
      })
      .catch(error => {
        console.error('상품 조회 실패:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [initialProducts.length])

  // 필터링된 상품 목록 (단일 필터로 최적화)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products.filter(p => !existingProductIds.includes(p.id))
    }

    const query = searchQuery.toLowerCase()
    return products.filter(p => 
      !existingProductIds.includes(p.id) &&
      (
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      )
    )
  }, [products, searchQuery, existingProductIds])

  const handleAddProducts = async () => {
    if (selectedProducts.length === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/banners/${bannerId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: selectedProducts }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다')
        onSuccess()
        onClose()
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    }
  }

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">상품 선택</h2>
          <button
            onClick={() => {
              onClose()
              setSelectedProducts([])
              setSearchQuery('')
            }}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품 검색..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? '검색 결과가 없습니다' : '추가할 수 있는 상품이 없습니다'}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleToggleProduct(product.id)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.brand && `${product.brand} · `}
                        {formatPrice(product.price)}원
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t mt-4">
            <button
              onClick={handleAddProducts}
              disabled={selectedProducts.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              추가 ({selectedProducts.length})
            </button>
            <button
              onClick={() => {
                onClose()
                setSelectedProducts([])
                setSearchQuery('')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

