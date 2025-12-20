'use client'

import type { TimeDeal, TimeDealProduct } from '../_types'

interface TimeDealDetailProps {
  timeDeal: TimeDeal | null
  timeDealProducts: TimeDealProduct[]
  isActive: (timeDeal: TimeDeal) => boolean
  onEdit: (timeDeal: TimeDeal) => void
  onDelete: (id: number) => void
  onAddProducts: () => void
  onRemoveProduct: (productId: string) => void
  onUpdateProductDiscount: (productId: string, discountPercent: number, sortOrder: number) => void
}

export default function TimeDealDetail({
  timeDeal,
  timeDealProducts,
  isActive,
  onEdit,
  onDelete,
  onAddProducts,
  onRemoveProduct,
  onUpdateProductDiscount,
}: TimeDealDetailProps) {
  if (!timeDeal) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500">타임딜을 선택하세요</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{timeDeal.title}</h2>
          {timeDeal.description && (
            <p className="text-sm text-gray-500 mb-1">{timeDeal.description}</p>
          )}
          <p className="text-xs text-gray-400">
            {new Date(timeDeal.start_at).toLocaleString('ko-KR')} ~{' '}
            {new Date(timeDeal.end_at).toLocaleString('ko-KR')}
          </p>
          {isActive(timeDeal) && (
            <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
              진행중
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(timeDeal)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(timeDeal.id)}
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
        <h3 className="font-medium mb-3">포함된 상품 ({timeDealProducts.length}개)</h3>
        {timeDealProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">상품이 없습니다</div>
        ) : (
          <div className="space-y-2">
            {timeDealProducts
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((tp) => {
                const product = Array.isArray(tp.products) ? tp.products[0] : tp.products
                return product ? (
                  <div key={tp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.category} • {product.price.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-600">할인율:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tp.discount_percent}
                          onChange={(e) => {
                            const newPercent = parseInt(e.target.value) || 0
                            onUpdateProductDiscount(product.id, newPercent, tp.sort_order)
                          }}
                          className="w-16 px-2 py-1 text-sm border rounded"
                        />
                        <span className="text-xs text-gray-600">%</span>
                      </div>
                      <button
                        onClick={() => onRemoveProduct(product.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        제거
                      </button>
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

