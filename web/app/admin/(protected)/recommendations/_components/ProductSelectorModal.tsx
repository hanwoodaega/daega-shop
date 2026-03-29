'use client'

import { formatPrice } from '@/lib/utils/utils'
import type { Product, SelectedProduct } from '../_types'

interface ProductSelectorModalProps {
  isOpen: boolean
  availableProducts: Product[]
  selectedProducts: SelectedProduct[]
  searchQuery: string
  onClose: () => void
  onSearchChange: (query: string) => void
  onToggleProduct: (productId: string) => void
  onUpdateSortOrder: (productId: string, sortOrder: number) => void
  onAdd: () => void
}

export default function ProductSelectorModal({
  isOpen,
  availableProducts,
  selectedProducts,
  searchQuery,
  onClose,
  onSearchChange,
  onToggleProduct,
  onUpdateSortOrder,
  onAdd,
}: ProductSelectorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">상품 선택</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="p-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="상품 검색..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {availableProducts.map((product) => {
              const isSelected = selectedProducts.some((sp) => sp.product_id === product.id)
              const selectedItem = selectedProducts.find((sp) => sp.product_id === product.id)
              return (
                <div
                  key={product.id}
                  className={`p-3 border rounded-lg transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleProduct(product.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {product.brand && `${product.brand} · `}
                        {formatPrice(product.price)}원
                      </p>
                      {isSelected && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">순서</label>
                          <input
                            type="number"
                            value={selectedItem?.sort_order || 0}
                            onChange={(e) => {
                              const newOrder = parseInt(e.target.value) || 0
                              onUpdateSortOrder(product.id, newOrder)
                            }}
                            className="w-20 px-2 py-1 text-xs border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={onAdd}
              disabled={selectedProducts.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              추가 ({selectedProducts.length})
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

