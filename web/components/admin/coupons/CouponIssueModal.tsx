'use client'

import { Coupon } from '@/lib/supabase'
import { IssueConditions } from './types'

interface CouponIssueModalProps {
  isOpen: boolean
  coupon: Coupon | null
  conditions: IssueConditions
  onClose: () => void
  onSubmit: () => void
  onConditionsChange: (conditions: IssueConditions) => void
}

export default function CouponIssueModal({
  isOpen,
  coupon,
  conditions,
  onClose,
  onSubmit,
  onConditionsChange,
}: CouponIssueModalProps) {
  if (!isOpen || !coupon) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          조건별 쿠폰 지급: {coupon.name}
        </h2>

        <div className="space-y-4 mb-6">
          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">특정 개인 지급</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="tel"
                value={conditions.phone}
                onChange={(e) => {
                  const numbers = e.target.value.replace(/[^0-9]/g, '')
                  onConditionsChange({ ...conditions, phone: numbers })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="01012345678"
                maxLength={11}
              />
              <p className="mt-1 text-xs text-gray-500">
                특정 개인에게 지급하려면 전화번호를 입력하세요. (하이픈 없이 숫자만)
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">생일 조건</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이번 달 생일인 사용자
              </label>
              <select
                value={conditions.birthday_month}
                onChange={(e) => onConditionsChange({ ...conditions, birthday_month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">선택 안함</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">구매 이력 조건</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매 기간 시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={conditions.purchase_period_start}
                  onChange={(e) => {
                    const newConditions = { ...conditions, purchase_period_start: e.target.value }
                    if (!e.target.value && !conditions.purchase_period_end) {
                      newConditions.min_purchase_amount = ''
                      newConditions.min_purchase_count = ''
                    }
                    onConditionsChange(newConditions)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  구매 금액/횟수 조건을 사용하려면 필수 입력입니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  구매 기간 종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={conditions.purchase_period_end}
                  onChange={(e) => {
                    const newConditions = { ...conditions, purchase_period_end: e.target.value }
                    if (!e.target.value && !conditions.purchase_period_start) {
                      newConditions.min_purchase_amount = ''
                      newConditions.min_purchase_count = ''
                    }
                    onConditionsChange(newConditions)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  구매 금액/횟수 조건을 사용하려면 필수 입력입니다
                </p>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    !conditions.purchase_period_start || !conditions.purchase_period_end
                      ? 'text-gray-400'
                      : 'text-gray-700'
                  }`}
                >
                  최소 구매 금액 (원)
                  {(!conditions.purchase_period_start || !conditions.purchase_period_end) && (
                    <span className="ml-2 text-xs text-red-500">(구매 기간 입력 필요)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={conditions.min_purchase_amount}
                  onChange={(e) => onConditionsChange({ ...conditions, min_purchase_amount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    !conditions.purchase_period_start || !conditions.purchase_period_end
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300'
                  }`}
                  disabled={!conditions.purchase_period_start || !conditions.purchase_period_end}
                  min="0"
                  placeholder="예: 50000"
                />
                {(!conditions.purchase_period_start || !conditions.purchase_period_end) && (
                  <p className="mt-1 text-xs text-red-500">구매 기간을 먼저 입력해야 합니다</p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    !conditions.purchase_period_start || !conditions.purchase_period_end
                      ? 'text-gray-400'
                      : 'text-gray-700'
                  }`}
                >
                  최소 구매 횟수
                  {(!conditions.purchase_period_start || !conditions.purchase_period_end) && (
                    <span className="ml-2 text-xs text-red-500">(구매 기간 입력 필요)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={conditions.min_purchase_count}
                  onChange={(e) => onConditionsChange({ ...conditions, min_purchase_count: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    !conditions.purchase_period_start || !conditions.purchase_period_end
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300'
                  }`}
                  disabled={!conditions.purchase_period_start || !conditions.purchase_period_end}
                  min="1"
                  placeholder="예: 3"
                />
                {(!conditions.purchase_period_start || !conditions.purchase_period_end) && (
                  <p className="mt-1 text-xs text-red-500">구매 기간을 먼저 입력해야 합니다</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 조건 안내:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>전화번호: 특정 개인에게 지급하려면 전화번호만 입력하세요 (다른 조건과 함께 사용 가능)</li>
              <li>생일 조건: 선택한 월에 생일인 사용자에게 지급</li>
              <li>
                구매 금액/횟수: <span className="font-semibold text-red-600">구매 기간을 먼저 입력해야 합니다</span>
              </li>
              <li>구매 금액: 지정한 기간 동안 총 구매 금액이 기준 이상인 사용자</li>
              <li>구매 횟수: 지정한 기간 동안 구매 횟수가 기준 이상인 사용자</li>
              <li>여러 조건을 동시에 설정하면 모든 조건을 만족하는 사용자에게만 지급됩니다</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            조건별 지급
          </button>
        </div>
      </div>
    </div>
  )
}

