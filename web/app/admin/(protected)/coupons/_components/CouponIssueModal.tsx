'use client'

import { Coupon } from '@/lib/supabase/supabase'
import { formatPhoneDisplay, parsePhoneInput, extractPhoneNumbers } from '@/lib/utils/format-phone'
import { IssueConditions } from '../_types'

interface CouponIssueModalProps {
  isOpen: boolean
  coupon: Coupon | null
  conditions: IssueConditions
  onClose: () => void
  onIssueByPhone: () => void
  onIssueToAll: () => void
  onConditionsChange: (conditions: IssueConditions) => void
}

export default function CouponIssueModal({
  isOpen,
  coupon,
  conditions,
  onClose,
  onIssueByPhone,
  onIssueToAll,
  onConditionsChange,
}: CouponIssueModalProps) {
  if (!isOpen || !coupon) return null

  const phoneNumbers = extractPhoneNumbers(conditions.phone || '')
  const canIssueByPhone = phoneNumbers.length >= 10 && phoneNumbers.length <= 11

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">쿠폰 지급: {coupon.name}</h2>

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">전화번호로 지급</h3>
            <input
              type="tel"
              value={formatPhoneDisplay(conditions.phone || '')}
              onChange={(e) => {
                onConditionsChange({ ...conditions, phone: parsePhoneInput(e.target.value) })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="휴대폰 번호"
              maxLength={13}
            />
            <button
              type="button"
              onClick={onIssueByPhone}
              disabled={!canIssueByPhone}
              className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              전화번호로 지급
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">전체 지급</h3>
            <p className="text-sm text-gray-500 mb-2">가입된 모든 사용자에게 쿠폰을 지급합니다.</p>
            <button
              type="button"
              onClick={onIssueToAll}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              전체 사용자에게 지급
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
