'use client'

import { formatPrice } from '@/lib/utils/utils'
import type { RecommendationCategory, RecommendationProduct } from '../_types'

interface RecommendationDetailProps {
  category: RecommendationCategory | null
  categoryProducts: RecommendationProduct[]
  onEdit: (category: RecommendationCategory) => void
  onDelete: (id: string) => void
  onAddProducts: () => void
  onRemoveProduct: (productId: string) => void
  onUpdateSortOrder: (productId: string, sortOrder: number) => void
}

export default function RecommendationDetail({
  category,
  categoryProducts,
  onEdit,
  onDelete,
  onAddProducts,
  onRemoveProduct,
  onUpdateSortOrder,
}: RecommendationDetailProps) {
  if (!category) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500">카테고리를 선택하세요</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{category.name}</h2>
          <p className="text-sm text-gray-500 mt-1">순서: {category.sort_order}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(category)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={onAddProducts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 상품 추가
        </button>
      </div>

      <div>
        <h3 className="font-medium mb-3">포함된 상품 ({categoryProducts.length}개)</h3>
        {categoryProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">상품이 없습니다</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categoryProducts.map((rp) => {
              const product = Array.isArray(rp.products) ? rp.products[0] : rp.products
              return product ? (
                <div key={rp.id} className="flex flex-col gap-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">순서:</label>
                      <input
                        type="number"
                        value={rp.sort_order || 0}
                        onChange={(e) => {
                          const newOrder = parseInt(e.target.value) || 0
                          onUpdateSortOrder(rp.product_id, newOrder)
                        }}
                        className="w-16 px-2 py-1 text-xs border rounded"
                      />
                    </div>
                    <button
                      onClick={() => onRemoveProduct(rp.product_id)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      제거
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {product.brand && `${product.brand} · `}
                      {formatPrice(product.price)}원
                    </p>
                  </div>
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
    </div>
  )
}

