'use client'

import { Product } from '../_types'

interface ProductSelectorModalProps {
  isOpen: boolean
  products: Product[]
  filteredProducts: Product[]
  selectedProducts: string[]
  searchQuery: string
  promotedProductIds: Set<string>
  editingPromotionId: string | null
  onClose: () => void
  onSearchChange: (query: string) => void
  onToggleProduct: (productId: string) => void
}

export default function ProductSelectorModal({
  isOpen,
  filteredProducts,
  selectedProducts,
  searchQuery,
  promotedProductIds,
  editingPromotionId,
  onClose,
  onSearchChange,
  onToggleProduct,
}: ProductSelectorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">상품 선택</h3>
          <button
            onClick={onClose}
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const isSelected = selectedProducts.includes(product.id)
              const isPromoted = promotedProductIds.has(product.id)
              const isDisabled = isPromoted && (!editingPromotionId || !selectedProducts.includes(product.id))
              
              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (!isDisabled) {
                      onToggleProduct(product.id)
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    isDisabled
                      ? 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'bg-blue-100 border-2 border-blue-500 cursor-pointer'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                  }`}
                >
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
                      {isPromoted && (
                        <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                          프로모션 적용중
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {product.category} • {product.price.toLocaleString()}원
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            {selectedProducts.length}개 선택됨
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

