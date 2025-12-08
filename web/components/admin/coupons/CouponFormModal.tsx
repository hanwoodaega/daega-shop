'use client'

import { CouponFormData } from './types'

interface CouponFormModalProps {
  isOpen: boolean
  editingCoupon: any | null
  formData: CouponFormData
  onClose: () => void
  onSubmit: () => void
  onFormDataChange: (data: CouponFormData) => void
}

export default function CouponFormModal({
  isOpen,
  editingCoupon,
  formData,
  onClose,
  onSubmit,
  onFormDataChange,
}: CouponFormModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {editingCoupon ? '쿠폰 수정' : '쿠폰 생성'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              쿠폰명 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              할인 유형 *
            </label>
            <select
              value={formData.discount_type}
              onChange={(e) => {
                const type = e.target.value as 'percentage' | 'fixed'
                onFormDataChange({
                  ...formData,
                  discount_type: type,
                  max_discount_amount: '', // discount_type 변경 시 초기화
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="percentage">할인율 (%)</option>
              <option value="fixed">고정 금액 (원)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.discount_type === 'percentage' ? '할인율 (%) *' : '할인 금액 (원) *'}
            </label>
            <input
              type="number"
              value={formData.discount_value}
              onChange={(e) => onFormDataChange({ ...formData, discount_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="0"
              step={formData.discount_type === 'percentage' ? '0.1' : '1'}
              placeholder={formData.discount_type === 'percentage' ? '예: 10 (10%)' : '예: 5000'}
              required
            />
          </div>

          {formData.discount_type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최대 할인 금액 (원) *
              </label>
              <input
                type="number"
                value={formData.max_discount_amount}
                onChange={(e) => onFormDataChange({ ...formData, max_discount_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
                step="1"
                placeholder="예: 10000"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                할인율 적용 시 최대 할인 가능한 금액을 입력하세요
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최소 구매 금액 (원)
            </label>
            <input
              type="number"
              value={formData.min_purchase_amount}
              onChange={(e) => onFormDataChange({ ...formData, min_purchase_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="0"
              step="1"
              placeholder="예: 10000 (비워두면 제한 없음)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              유효 기간 (일) *
            </label>
            <input
              type="number"
              value={formData.validity_days}
              onChange={(e) => onFormDataChange({ ...formData, validity_days: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
              max="365"
              step="1"
              placeholder="예: 7"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              쿠폰이 발급된 날짜부터 해당 일수만큼 유효합니다. (1일 ~ 365일)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_first_purchase_only"
              checked={formData.is_first_purchase_only}
              onChange={(e) => onFormDataChange({ ...formData, is_first_purchase_only: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_first_purchase_only" className="text-sm font-medium text-gray-700">
              첫구매 전용 쿠폰
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
          >
            {editingCoupon ? '수정' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

