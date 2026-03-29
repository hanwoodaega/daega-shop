'use client'

import { Promotion, PromotionFormData, Product } from '../_types'
import { BOGO_OPTIONS } from '../constants'

interface PromotionCreateModalProps {
  isOpen: boolean
  editingPromotion: Promotion | null
  formData: PromotionFormData
  selectedProducts: string[]
  products: Product[]
  onClose: () => void
  onUpdateField: <K extends keyof PromotionFormData>(field: K, value: PromotionFormData[K]) => void
  onToggleProduct: (productId: string) => void
  onOpenProductSelector: () => void
  onSubmit: (productIds: string[]) => Promise<boolean>
}

export default function PromotionCreateModal({
  isOpen,
  editingPromotion,
  formData,
  selectedProducts,
  products,
  onClose,
  onUpdateField,
  onToggleProduct,
  onOpenProductSelector,
  onSubmit,
}: PromotionCreateModalProps) {
  if (!isOpen) return null

  const handleSubmit = async () => {
    await onSubmit(selectedProducts)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingPromotion ? '프로모션 수정' : '새 프로모션 만들기'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 신상품 1+1 프로모션"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">프로모션 타입 *</label>
            <select
              value={formData.type}
              onChange={(e) => onUpdateField('type', e.target.value as 'bogo' | 'percent')}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="bogo">BOGO (1+1, 2+1, 3+1)</option>
              <option value="percent">할인율 (%)</option>
            </select>
          </div>

          {formData.type === 'bogo' ? (
            <div>
              <label className="block text-sm font-medium mb-2">구매 개수 *</label>
              <select
                value={formData.buy_qty}
                onChange={(e) => onUpdateField('buy_qty', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {BOGO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">할인율 (%) *</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Number.isFinite(formData.discount_percent) ? formData.discount_percent : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    onUpdateField('discount_percent', 0)
                    return
                  }
                  const num = parseFloat(v)
                  onUpdateField('discount_percent', Number.isFinite(num) ? num : 0)
                }}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="예: 20"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              상품 선택 ({selectedProducts.length}개)
            </label>
            <button
              onClick={onOpenProductSelector}
              className="w-full px-3 py-2 border rounded-lg text-left hover:bg-gray-50"
            >
              상품 선택하기 ({selectedProducts.length}개 선택됨)
            </button>
            {selectedProducts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProducts.map((productId) => {
                  const product = products.find((p) => p.id === productId)
                  return product ? (
                    <span
                      key={productId}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {product.name}
                      <button
                        onClick={() => onToggleProduct(productId)}
                        className="text-red-600 hover:text-blue-950"
                      >
                        ×
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {editingPromotion ? '수정' : '생성'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

