'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth/auth-context'
import { getUserCoupons, isCouponValid, getCouponValidityPeriod } from '@/lib/coupon/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { useCartStore } from '@/lib/store'

export default function CouponsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [usedCouponsList, setUsedCouponsList] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'available' | 'used'>('available')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/profile/coupons')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user?.id) {
      loadCoupons()
    }
  }, [user?.id, activeTab])

  const loadCoupons = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 현재 탭에 맞는 쿠폰 로드
      const userCoupons = await getUserCoupons(activeTab === 'used')
      setCoupons(userCoupons)
      
      // 사용 완료 쿠폰 개수를 항상 표시하기 위해 사용 완료 쿠폰도 조회
      // activeTab이 'available'일 때만 별도로 조회 (이미 'used'일 때는 userCoupons에 포함됨)
      if (activeTab === 'available') {
        const allCoupons = await getUserCoupons(true)
        setUsedCouponsList(allCoupons.filter(uc => uc.is_used))
      } else {
        setUsedCouponsList(userCoupons.filter(uc => uc.is_used))
      }
    } catch (error) {
      console.error('쿠폰 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const checkCouponValid = (userCoupon: UserCoupon) => {
    const coupon = userCoupon.coupon as Coupon
    return isCouponValid(userCoupon, coupon)
  }

  const availableCoupons = coupons.filter(uc => !uc.is_used && checkCouponValid(uc))
  const usedCoupons = activeTab === 'used' 
    ? coupons.filter(uc => uc.is_used && checkCouponValid(uc))
    : usedCouponsList.filter(uc => checkCouponValid(uc))

  const displayCoupons = activeTab === 'available' 
    ? availableCoupons
    : usedCoupons

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
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
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              내 쿠폰함
            </h1>
          </div>
          
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">

        {/* 탭 */}
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

        {/* 쿠폰 목록 */}
        {displayCoupons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
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
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {coupon.name}
                      </h3>
                      {coupon.description && (
                        <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                      )}
                    </div>
                    {userCoupon.is_used && (
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                        사용 완료
                      </span>
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
                    <div className="text-xs text-gray-500 mt-1">
                      사용일: {formatDate(userCoupon.used_at)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

