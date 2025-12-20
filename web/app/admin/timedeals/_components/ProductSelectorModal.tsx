'use client'

import type { Product, SelectedProductData } from '../_types'

interface ProductSelectorModalProps {
  isOpen: boolean
  products: Product[]
  selectedProducts: Map<string, SelectedProductData>
  existingProductIds: Set<string>
  promotedProductIds: Set<string>
  searchQuery: string
  onClose: () => void
  onSearchChange: (query: string) => void
  onToggleProduct: (productId: string) => void
  onUpdateDiscount: (productId: string, discountPercent: number) => void
  onAdd: () => void
}

export default function ProductSelectorModal({
  isOpen,
  products,
  selectedProducts,
  existingProductIds,
  promotedProductIds,
  searchQuery,
  onClose,
  onSearchChange,
  onToggleProduct,
  onUpdateDiscount,
  onAdd,
}: ProductSelectorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">상품 선택</h3>
          <button onClick={onClose} className="text-white text-2xl hover:text-gray-200">
            ×
          </button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="상품명 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id)
              const isInTimeDeal = existingProductIds.has(product.id)
              const isPromoted = promotedProductIds.has(product.id)
              const isDisabled = isInTimeDeal || isPromoted
              const selectedData = selectedProducts.get(product.id)

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (!isDisabled) {
                      onToggleProduct(product.id)
                    }
                  }}
                  className={`p-3 rounded-lg transition ${
                    isDisabled
                      ? 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => {}}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{product.name}</p>
                        {isInTimeDeal && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                            이미 추가됨
                          </span>
                        )}
                        {isPromoted && !isInTimeDeal && (
                          <span className="px-2 py-0.5 bg-orange-200 text-orange-700 text-xs font-bold rounded">
                            프로모션 상품
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {product.category} • {product.price.toLocaleString()}원
                      </p>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-gray-600">할인율:</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedData?.discount_percent || 0}
                            onChange={(e) => {
                              e.stopPropagation()
                              onUpdateDiscount(product.id, parseInt(e.target.value) || 0)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 px-2 py-1 text-sm border rounded"
                          />
                          <span className="text-xs text-gray-600">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">{selectedProducts.size}개 선택됨</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={onAdd}
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

