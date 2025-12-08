'use client'

import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'
import { ProductSelectorModal } from './index'
import type { Collection, Product, CollectionProduct } from './types'

interface CollectionDetailProps {
  collection: Collection | null
  onEdit: (collection: Collection) => void
  onDelete: () => void
  initialProducts: Product[]
  promotedProductIds: Set<string>
}

export default function CollectionDetail({
  collection,
  onEdit,
  onDelete,
  initialProducts,
  promotedProductIds,
}: CollectionDetailProps) {
  const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (collection) {
      fetchCollectionProducts(collection.id)
    } else {
      setCollectionProducts([])
    }
  }, [collection])

  const fetchCollectionProducts = async (collectionId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`)
      const data = await res.json()
      if (res.ok) {
        setCollectionProducts(data.products || [])
      }
    } catch (error) {
      console.error('컬렉션 상품 조회 실패:', error)
      setCollectionProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!collection) return
    if (!confirm('이 컬렉션을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/collections/${collection.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('컬렉션이 삭제되었습니다')
        onDelete()
      } else {
        const data = await res.json()
        toast.error(data.error || '컬렉션 삭제 실패')
      }
    } catch (error) {
      console.error('컬렉션 삭제 실패:', error)
      toast.error('컬렉션 삭제에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!collection) return
    if (!confirm('이 상품을 컬렉션에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/collections/${collection.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchCollectionProducts(collection.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const handleUpdatePriority = async (collectionProductId: string, newPriority: number | null) => {
    if (!collection) return

    try {
      const res = await fetch(`/api/admin/collections/${collection.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_product_id: collectionProductId,
          priority: newPriority === null || newPriority === undefined ? null : newPriority,
        }),
      })

      if (res.ok) {
        fetchCollectionProducts(collection.id)
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
    if (collection) {
      fetchCollectionProducts(collection.id)
    }
  }

  // 이미 컬렉션에 포함된 상품 ID Set
  const existingProductIds = useMemo(
    () => new Set(collectionProducts.map(cp => cp.product_id)),
    [collectionProducts]
  )

  if (!collection) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500">컬렉션을 선택하세요</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold mb-1">{collection.type}</h2>
            {collection.title && (
              <p className="text-sm text-gray-500 mb-1">{collection.title}</p>
            )}
            {collection.description && (
              <p className="text-sm text-gray-400 mb-1">{collection.description}</p>
            )}
            <p className="text-xs text-gray-400">순서: {collection.sort_order ?? 0}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(collection)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              삭제
            </button>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => setShowProductSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 상품 추가
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              포함된 상품 ({collectionProducts.length}개)
            </h3>
            <p className="text-xs text-gray-500">
              * 순서를 설정하면 낮은 순서부터 표시됩니다 (메인 페이지에서 상위 4개만 표시)
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : collectionProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              상품이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...collectionProducts]
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
      {showProductSelector && (
        <ProductSelectorModal
          collectionId={collection.id}
          existingProductIds={existingProductIds}
          initialProducts={initialProducts}
          promotedProductIds={promotedProductIds}
          onClose={() => setShowProductSelector(false)}
          onSuccess={handleProductsAdded}
        />
      )}
    </>
  )
}

