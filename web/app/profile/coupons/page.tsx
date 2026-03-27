'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useCoupons } from '@/lib/swr'
import { isCouponValid, getCouponValidityPeriod } from '@/lib/coupon/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { useCartStore } from '@/lib/store'

export default function CouponsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const { coupons: allCoupons, isLoading: loading, mutate } = useCoupons(true)
  const [activeTab, setActiveTab] = useState<'available' | 'used'>('available')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const checkCouponValid = (userCoupon: UserCoupon) => {
    const coupon = userCoupon.coupon as Coupon
    return isCouponValid(userCoupon, coupon)
  }

  const availableCoupons = allCoupons.filter(uc => !uc.is_used && checkCouponValid(uc))
  const usedCoupons = allCoupons.filter(uc => uc.is_used)
  const displayCoupons = activeTab === 'available' ? availableCoupons : usedCoupons

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">내 쿠폰함</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC 전용: DOM 순서상 먼저 배치해 PC에서 모바일 UI 플래시 방지 */}
      <div className="hidden lg:block flex-1 w-full">
        <div className="container mx-auto px-4 py-6 pb-6 max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-5 pb-0 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 mb-4 text-center">내 쿠폰함</h2>
            <div className="border-t border-gray-200">
              <div className="flex border-b border-gray-200 -mb-px">
                <button
                  onClick={() => setActiveTab('available')}
                  className={`flex-1 py-3 text-center font-medium transition ${
                    activeTab === 'available'
                      ? 'text-primary-800 border-b-2 border-primary-800'
                      : 'text-gray-600'
                  }`}
                >
                  보유 쿠폰 ({availableCoupons.length})
                </button>
                <button
                  onClick={() => setActiveTab('used')}
                  className={`flex-1 py-3 text-center font-medium transition ${
                    activeTab === 'used'
                      ? 'text-primary-800 border-b-2 border-primary-800'
                      : 'text-gray-600'
                  }`}
                >
                  사용 완료 ({usedCoupons.length})
                </button>
              </div>
            </div>
          </div>

          {displayCoupons.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <div className="flex justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-gray-600">
                {activeTab === 'available' ? '보유한 쿠폰이 없습니다.' : '사용한 쿠폰이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayCoupons.map((userCoupon) => {
                const coupon = userCoupon.coupon as Coupon
                return (
                  <div
                    key={userCoupon.id}
                    className={`bg-white rounded-lg border-2 p-4 shadow-sm ${
                      userCoupon.is_used
                        ? 'border-gray-200 opacity-75'
                        : 'border-primary-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{coupon.name}</h3>
                        {coupon.description && (
                          <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                        )}
                      </div>
                      {userCoupon.is_used && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">사용 완료</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">할인</span>
                        <span className="text-lg font-bold text-primary-800">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : `${coupon.discount_value.toLocaleString()}원`}
                        </span>
                      </div>
                      {coupon.min_purchase_amount && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">최소 구매 금액</span>
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.min_purchase_amount.toLocaleString()}원 이상
                          </span>
                        </div>
                      )}
                      {coupon.max_discount_amount && coupon.discount_type === 'percentage' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">최대 할인 금액</span>
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.max_discount_amount.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      유효기간: {(() => {
                        const period = getCouponValidityPeriod(userCoupon, coupon)
                        return `${period.start} ~ ${period.end}`
                      })()}
                    </div>
                    {userCoupon.used_at && (
                      <div className="text-xs text-gray-500 mt-1">사용일: {formatDate(userCoupon.used_at)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 모바일 전용 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              내 쿠폰함
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* 모바일 전용 */}
        <div className="lg:hidden">
          <div className="bg-white rounded-lg shadow-md mb-4">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 py-3 text-center font-medium transition ${
                  activeTab === 'available'
                    ? 'text-primary-800 border-b-2 border-primary-800'
                    : 'text-gray-600'
                }`}
              >
                보유 쿠폰 ({availableCoupons.length})
              </button>
              <button
                onClick={() => setActiveTab('used')}
                className={`flex-1 py-3 text-center font-medium transition ${
                  activeTab === 'used'
                    ? 'text-primary-800 border-b-2 border-primary-800'
                    : 'text-gray-600'
                }`}
              >
                사용 완료 ({usedCoupons.length})
              </button>
            </div>
          </div>

          {displayCoupons.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-gray-600">
                {activeTab === 'available' ? '보유한 쿠폰이 없습니다.' : '사용한 쿠폰이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayCoupons.map((userCoupon) => {
                const coupon = userCoupon.coupon as Coupon
                return (
                  <div
                    key={userCoupon.id}
                    className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                      userCoupon.is_used
                        ? 'border-gray-300 opacity-60'
                        : 'border-primary-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{coupon.name}</h3>
                        {coupon.description && (
                          <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                        )}
                      </div>
                      {userCoupon.is_used && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">사용 완료</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">할인</span>
                        <span className="text-lg font-bold text-primary-800">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : `${coupon.discount_value.toLocaleString()}원`}
                        </span>
                      </div>
                      {coupon.min_purchase_amount && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">최소 구매 금액</span>
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.min_purchase_amount.toLocaleString()}원 이상
                          </span>
                        </div>
                      )}
                      {coupon.max_discount_amount && coupon.discount_type === 'percentage' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">최대 할인 금액</span>
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.max_discount_amount.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      유효기간: {(() => {
                        const period = getCouponValidityPeriod(userCoupon, coupon)
                        return `${period.start} ~ ${period.end}`
                      })()}
                    </div>
                    {userCoupon.used_at && (
                      <div className="text-xs text-gray-500 mt-1">사용일: {formatDate(userCoupon.used_at)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

