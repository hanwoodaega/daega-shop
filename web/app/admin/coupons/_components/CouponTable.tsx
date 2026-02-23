'use client'

import { Coupon } from '@/lib/supabase/supabase'

interface CouponTableProps {
  coupons: Coupon[]
  onEdit: (coupon: Coupon) => void
  onToggleActive: (coupon: Coupon) => void
  onDelete: (couponId: string) => void
  onIssueWithConditions: (coupon: Coupon) => void
  onIssueToAll: (couponId: string) => void
}

export default function CouponTable({
  coupons,
  onEdit,
  onToggleActive,
  onDelete,
  onIssueWithConditions,
  onIssueToAll,
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
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
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    coupon.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {coupon.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onEdit(coupon)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  수정
                </button>
                <button
                  onClick={() => onToggleActive(coupon)}
                  className="text-blue-600 hover:text-red-600"
                >
                  {coupon.is_active ? '비활성화' : '활성화'}
                </button>
                {coupon.is_active && (
                  <>
                    {coupon.issue_trigger === 'PHONE_VERIFIED' ? (
                      <span className="text-sm text-gray-500">휴대폰 인증 자동 지급</span>
                    ) : (
                      <>
                        <button
                          onClick={() => onIssueWithConditions(coupon)}
                          className="text-green-600 hover:text-green-900"
                        >
                          조건별 지급
                        </button>
                        <button
                          onClick={() => onIssueToAll(coupon.id)}
                          className="text-blue-600 hover:text-red-600"
                        >
                          전체 지급
                        </button>
                      </>
                    )}
                  </>
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

