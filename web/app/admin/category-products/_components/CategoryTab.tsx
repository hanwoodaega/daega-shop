'use client'

import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils/utils'
import CategoryProductSelectorModal from './CategoryProductSelectorModal'
import CategoryEditModal from './CategoryEditModal'
import type { Category, Product, CategoryProduct } from '../_types'

interface CategoryTabProps {
  type: 'best' | 'sale' | 'no9'
  category: Category | null
  initialProducts: Product[]
  promotedProductIds: Set<string>
  onCategoryRefreshed: () => void
}

export default function CategoryTab({
  type,
  category,
  initialProducts,
  promotedProductIds,
  onCategoryRefreshed,
}: CategoryTabProps) {
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(category)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    setCurrentCategory(category)
    if (category) {
      fetchCategoryProducts(category.id)
    } else {
      setCategoryProducts([])
    }
  }, [category])

  const fetchCategoryProducts = async (categoryId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`)
      const data = await res.json()
      if (res.ok) {
        setCategoryProducts(data.products || [])
      }
    } catch (error) {
      console.error('카테고리 상품 조회 실패:', error)
      setCategoryProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddProducts = async () => {
    if (!currentCategory) {
      toast.error('카테고리를 찾을 수 없습니다. 마이그레이션을 실행했는지 확인해주세요.')
      return
    }

    setShowProductSelector(true)
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!currentCategory) return
    if (!window.confirm('이 상품을 카테고리에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/categories/${currentCategory.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchCategoryProducts(currentCategory.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const handleUpdatePriority = async (categoryProductId: string, newPriority: number | null) => {
    if (!currentCategory) return

    try {
      const res = await fetch(`/api/admin/categories/${currentCategory.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_product_id: categoryProductId,
          priority: newPriority === null || newPriority === undefined ? null : newPriority,
        }),
      })

      if (res.ok) {
        fetchCategoryProducts(currentCategory.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '순서 변경에 실패했습니다')
      }
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
    }
  }

  const handleProductsAdded = () => {
    if (currentCategory) {
      fetchCategoryProducts(currentCategory.id)
    }
  }

  const handleUpdateCategory = async (title: string, description: string) => {
    if (!currentCategory) return

    try {
      const res = await fetch(`/api/admin/categories/${currentCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentCategory(data.category)
        toast.success('카테고리 정보가 수정되었습니다')
        setShowEditModal(false)
      } else {
        const data = await res.json()
        toast.error(data.error || '카테고리 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('카테고리 수정 실패:', error)
      toast.error('카테고리 수정에 실패했습니다')
    }
  }

  // 이미 카테고리에 포함된 상품 ID Set
  const existingProductIds = useMemo(
    () => new Set(categoryProducts.map(cp => cp.product_id)),
    [categoryProducts]
  )

  const typeLabels = {
    best: '베스트',
    sale: '특가',
    no9: '한우대가 NO.9',
  }

  if (!currentCategory) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 font-semibold mb-2">{typeLabels[type]} 카테고리를 찾을 수 없습니다</p>
          <p className="text-sm text-red-600">
            마이그레이션 파일(<code className="bg-red-100 px-1 rounded">migrations/create_categories_tables.sql</code>)을 실행했는지 확인해주세요.
          </p>
        </div>
        <button
          onClick={onCategoryRefreshed}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새로고침
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold">{typeLabels[type]}</h2>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                {currentCategory.type}
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                title="설명 수정 (제목은 변경 불가)"
              >
                설명 수정
              </button>
            </div>
            {currentCategory.description && (
              <div className="text-sm text-gray-500 mb-1">
                <span className="font-medium">관리자 메모:</span> {currentCategory.description}
                <span className="text-xs text-gray-400 ml-2">(프론트엔드에 표시되지 않음)</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={handleAddProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 상품 추가
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              포함된 상품 ({categoryProducts.length}개)
            </h3>
            <p className="text-xs text-gray-500">
              * 순서를 설정하면 낮은 순서부터 표시됩니다
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : categoryProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              상품이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...categoryProducts]
                .sort((a, b) => {
                  const aPriority = a.priority ?? 999999
                  const bPriority = b.priority ?? 999999
                  return aPriority - bPriority
                })
                .map((cp) => {
                  const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
                  return product ? (
                    <div
                      key={cp.id}
                      className="flex flex-col gap-2 p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="number"
                          min="0"
                          value={cp.priority ?? ''}
                          placeholder="순서"
                          onBlur={(e) => {
                            const value = e.target.value
                            const newPriority = value === '' ? null : (parseInt(value) || null)
                            handleUpdatePriority(cp.id, newPriority)
                          }}
                          className="w-16 px-1 py-0.5 text-xs border rounded text-center"
                        />
                        <button
                          onClick={() => handleRemoveProduct(cp.product_id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          제거
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {product.category} • {formatPrice(product.price)}원
                        </p>
                      </div>
                    </div>
                  ) : null
                })}
            </div>
          )}
        </div>
      </div>

      {/* 상품 선택 모달 */}
      {showProductSelector && currentCategory && (
        <CategoryProductSelectorModal
          categoryId={currentCategory.id}
          existingProductIds={existingProductIds}
          initialProducts={initialProducts}
          promotedProductIds={promotedProductIds}
          onClose={() => setShowProductSelector(false)}
          onSuccess={handleProductsAdded}
        />
      )}

      {/* 카테고리 정보 수정 모달 */}
      {showEditModal && currentCategory && (
        <CategoryEditModal
          category={currentCategory}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateCategory}
        />
      )}
    </>
  )
}

