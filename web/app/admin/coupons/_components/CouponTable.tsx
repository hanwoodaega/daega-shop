'use client'

import { Coupon } from '@/lib/supabase/supabase'

interface CouponTableProps {
  coupons: Coupon[]
  onDelete: (couponId: string) => void
  onIssue: (coupon: Coupon) => void
}

export default function CouponTable({
  coupons,
  onDelete,
  onIssue,
}: CouponTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">쿠폰명</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">할인</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">유효기간</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">발급 트리거</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {coupons.map((coupon) => (
            <tr
              key={coupon.id}
              className={coupon.issue_trigger === 'PHONE_VERIFIED' ? 'bg-blue-50/40' : undefined}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{coupon.name}</div>
                {coupon.description && (
                  <div className="text-sm text-gray-500">{coupon.description}</div>
                )}
                {coupon.issue_trigger === 'PHONE_VERIFIED' && (
                  <div className="mt-1 inline-flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    휴대폰 인증 자동 지급
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {coupon.discount_type === 'percentage'
                  ? `${coupon.discount_value}%`
                  : `${coupon.discount_value.toLocaleString()}원`}
                {coupon.min_purchase_amount && (
                  <div className="text-xs text-gray-500">
                    최소 {coupon.min_purchase_amount.toLocaleString()}원
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {coupon.validity_days}일
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {coupon.issue_trigger === 'PHONE_VERIFIED'
                  ? '휴대폰 인증'
                  : coupon.issue_trigger === 'ETC'
                    ? '기타'
                    : '관리자'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                {coupon.is_active && coupon.issue_trigger !== 'PHONE_VERIFIED' && (
                  <button
                    onClick={() => onIssue(coupon)}
                    className="text-green-600 hover:text-green-900"
                  >
                    지급하기
                  </button>
                )}
                {coupon.issue_trigger === 'PHONE_VERIFIED' && (
                  <span className="text-sm text-gray-500">휴대폰 인증 자동 지급</span>
                )}
                <button
                  onClick={() => onDelete(coupon.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

