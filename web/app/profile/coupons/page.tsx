'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { getUserCoupons, isCouponValid, getCouponValidityPeriod } from '@/lib/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase'

export default function CouponsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
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
      const userCoupons = await getUserCoupons(user.id, activeTab === 'used')
      setCoupons(userCoupons)
    } catch (error) {
      console.error('쿠폰 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
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
  const usedCoupons = coupons.filter(uc => uc.is_used)
  const expiredCoupons = coupons.filter(uc => !uc.is_used && !checkCouponValid(uc))

  const displayCoupons = activeTab === 'available' 
    ? [...availableCoupons, ...expiredCoupons]
    : usedCoupons

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">내 쿠폰함</h1>
        </div>

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
              const isValid = isCouponValid(userCoupon, coupon)
              const isExpired = !userCoupon.is_used && !isValid

              return (
                <div
                  key={userCoupon.id}
                  className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                    userCoupon.is_used
                      ? 'border-gray-300 opacity-60'
                      : isExpired
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
                    {isExpired && (
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                        만료됨
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

