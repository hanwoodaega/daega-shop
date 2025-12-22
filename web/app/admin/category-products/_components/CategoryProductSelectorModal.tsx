'use client'

import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils/utils'
import { useDebounce } from '../../collections/_hooks/useDebounce'
import type { Product } from '../_types'

interface CategoryProductSelectorModalProps {
  categoryId: string
  existingProductIds: Set<string>
  initialProducts: Product[]
  promotedProductIds: Set<string>
  onClose: () => void
  onSuccess: () => void
}

export default function CategoryProductSelectorModal({
  categoryId,
  existingProductIds,
  initialProducts,
  promotedProductIds,
  onClose,
  onSuccess,
}: CategoryProductSelectorModalProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(initialProducts.length === 0)

  // 검색어 debounce
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

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

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim()
    
    if (!query) {
      return products.filter(p => !existingProductIds.has(p.id))
    }

    return products.filter(p => 
      !existingProductIds.has(p.id) &&
      (
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      )
    )
  }, [products, debouncedSearchQuery, existingProductIds])

  const handleAddProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selectedProducts) }),
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
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">상품 선택</h3>
          <button
            onClick={() => {
              onClose()
              setSelectedProducts(new Set())
              setSearchQuery('')
            }}
            className="text-white text-2xl hover:text-gray-200"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="상품명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? '검색 결과가 없습니다' : '추가할 수 있는 상품이 없습니다'}
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const isPromoted = promotedProductIds.has(product.id)

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleToggleProduct(product.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{product.name}</p>
                          {isPromoted && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                              프로모션 적용중
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {product.category} • {formatPrice(product.price)}원
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            {selectedProducts.size}개 선택됨
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose()
                setSelectedProducts(new Set())
                setSearchQuery('')
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleAddProducts}
              disabled={selectedProducts.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

