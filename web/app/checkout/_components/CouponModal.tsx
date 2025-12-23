'use client'

import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { formatPrice } from '@/lib/utils/utils'

interface CouponModalProps {
  isOpen: boolean
  onClose: () => void
  availableCoupons: UserCoupon[]
  selectedCoupon: UserCoupon | null
  onSelectCoupon: (coupon: UserCoupon | null) => void
  loadingCoupons: boolean
  subtotal: number
}

export default function CouponModal({
  isOpen,
  onClose,
  availableCoupons,
  selectedCoupon,
  onSelectCoupon,
  loadingCoupons,
  subtotal,
}: CouponModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">쿠폰 선택</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {loadingCoupons ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
            </div>
          ) : availableCoupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              사용 가능한 쿠폰이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  onSelectCoupon(null)
                  onClose()
                }}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  !selectedCoupon
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">쿠폰 미사용</div>
              </button>

              {availableCoupons.map((userCoupon) => {
                const coupon = userCoupon.coupon as Coupon
                const isSelected = selectedCoupon?.id === userCoupon.id
                const canUse = !coupon.min_purchase_amount || subtotal >= coupon.min_purchase_amount

                return (
                  <button
                    key={userCoupon.id}
                    onClick={() => {
                      if (canUse) {
                        onSelectCoupon(userCoupon)
                        onClose()
                      }
                    }}
                    disabled={!canUse}
                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : canUse
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">{coupon.name}</div>
                        {coupon.description && (
                          <div className="text-sm text-gray-600 mb-2">{coupon.description}</div>
                        )}
                        <div className="text-sm text-gray-500">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              {coupon.discount_value}% 할인
                              {coupon.max_discount_amount && (
                                <span className="ml-1">
                                  (최대 {formatPrice(coupon.max_discount_amount)}원)
                                </span>
                              )}
                            </>
                          ) : (
                            `${formatPrice(coupon.discount_value)}원 할인`
                          )}
                          {coupon.min_purchase_amount && (
                            <span className="ml-2">
                              (최소 {formatPrice(coupon.min_purchase_amount)}원 이상 구매)
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-primary-800 font-bold">✓</span>
                      )}
                    </div>
                    {!canUse && (
                      <div className="text-xs text-red-600 mt-2">
                        최소 구매 금액 미달
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

