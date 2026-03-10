'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { useProfileInfo } from '@/lib/swr'
import { useCartStore } from '@/lib/store'
import { useOrders } from '@/lib/order'
import OrdersList from '@/app/orders/_components/OrdersList'
import OrderSkeleton from '@/app/orders/_components/OrderSkeleton'
import GiftShareBox from '@/app/orders/_components/GiftShareBox'

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, signOut } = useAuth()
  const { data: profileInfo, isLoading: loadingProfileInfo } = useProfileInfo()
  const giftToken = searchParams?.get('giftToken')
  const {
    orders,
    loadingOrders,
    cancelingOrderId,
    confirmingOrderId,
    expandedOrders,
    giftOrder,
    orderPeriodMonths,
    setOrderPeriodMonths,
    toggleOrderExpand,
    handleCancelOrder,
    handleTrackDelivery,
    handleConfirmPurchase,
  } = useOrders({ userId: user?.id ?? undefined, giftToken: giftToken ?? undefined, orderPeriodMonths: 1 })
  const userName = profileInfo?.name ?? user?.user_metadata?.name ?? '사용자'
  const orderCount = profileInfo?.orders_count ?? 0
  const points = profileInfo?.points ?? 0
  const couponCount = profileInfo?.coupons_count ?? 0
  const giftCount = 0
  const cartCount = useCartStore((state) => state.getTotalItems())
  const loadingProfile = loading || (!!user?.id && loadingProfileInfo && !profileInfo)

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') sessionStorage.setItem('logout_redirect', '1')
    await signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="lg:hidden">
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
                <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">마이페이지</h1>
              </div>
            </div>
          </header>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일: 마이페이지 전용 헤더 */}
      <div className="lg:hidden">
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
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">마이페이지</h1>
            </div>
          </div>
        </header>
      </div>

      <main className="flex-1 container mx-auto max-w-2xl px-4 py-6 pb-24 lg:pb-6 lg:max-w-none">
        {/* PC 전용: 오른쪽 영역 디폴트 = 주문 내역 */}
        <div className="hidden lg:block">
          {user ? (
            <>
              {/* 상단 카드: 제목 + 기간/검색 */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-primary-900 mb-4 text-center">주문 내역</h2>
                <div className="border-t border-gray-200 pt-4 flex flex-wrap items-center gap-3">
                  <select
                    value={orderPeriodMonths}
                    onChange={(e) => setOrderPeriodMonths(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value={1}>1개월</option>
                    <option value={3}>3개월</option>
                    <option value={6}>6개월</option>
                    <option value={12}>1년</option>
                    <option value={36}>3년</option>
                  </select>
                  <div className="flex-1 min-w-[200px] relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      placeholder="상품명으로 검색해보세요"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
              {giftToken && (
                <GiftShareBox giftToken={giftToken} giftOrder={giftOrder} />
              )}
              <OrdersList
                orders={orders}
                loadingOrders={loadingOrders}
                expandedOrders={expandedOrders}
                cancelingOrderId={cancelingOrderId}
                confirmingOrderId={confirmingOrderId}
                onToggleExpand={toggleOrderExpand}
                onCancelOrder={handleCancelOrder}
                onConfirmPurchase={handleConfirmPurchase}
                onTrackDelivery={handleTrackDelivery}
              />
            </>
          ) : (
            <div className="bg-pink-100 rounded-lg shadow-md px-6 pt-6 pb-4">
              <Link href="/auth/login?next=/profile" className="flex items-center gap-2 hover:opacity-80 transition">
                <h1 className="text-lg font-medium text-black">로그인</h1>
                <span className="text-4xl font-medium text-black leading-none">·</span>
                <h1 className="text-lg font-medium text-black">회원가입</h1>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-sm text-black mt-3">회원가입하고 혜택 받아가세요!</p>
              <Link href="/auth/signup" className="inline-block mt-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-blue-950 transition">신규 회원 가입 혜택 보기</Link>
            </div>
          )}
        </div>

        {/* 모바일 전용: 마이페이지 대시보드 + 메뉴 */}
        <div className="lg:hidden">
        {user ? (
          <>
            {loadingProfile ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
              </div>
            ) : (
              <>
                {/* 사용자 정보 섹션 - 로그인 상태 */}
                <div className="bg-pink-100 rounded-lg shadow-md p-6 mb-6">
                  <div className="mb-3">
                    <Link
                      href="/profile/edit"
                      className="flex items-center gap-2 hover:opacity-80 transition"
                    >
                      <h1 className="text-base font-medium text-gray-900">
                        안녕하세요. {userName}님
                      </h1>
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <p className="text-xs text-gray-900 mt-1">주문 금액의 1% 적립</p>
                  </div>
                  
                  {/* 통계 버튼들 */}
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/orders"
                      className="px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition text-left border border-red-300"
                    >
                      <div className="text-sm text-gray-900 mb-0.5">주문 내역</div>
                      <div className="text-lg font-semibold text-gray-900">{orderCount}건</div>
                    </Link>
                    <Link
                      href="/profile/points"
                      className="px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition text-left border border-red-300"
                    >
                      <div className="text-sm text-gray-900 mb-0.5">포인트</div>
                      <div className="text-lg font-semibold text-gray-900">{points.toLocaleString()}원</div>
                    </Link>
                    <Link
                      href="/profile/coupons"
                      className="px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition text-left border border-red-300"
                    >
                      <div className="text-sm text-gray-900 mb-0.5">쿠폰</div>
                      <div className="text-lg font-semibold text-gray-900">{couponCount}장</div>
                    </Link>
                    <div
                      className="px-4 py-2 bg-white rounded-lg text-left cursor-default border border-red-300"
                    >
                      <div className="text-sm text-gray-900 mb-0.5">선물함</div>
                      <div className="text-lg font-semibold text-gray-900">{giftCount}건</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 메뉴 섹션 */}
            {!loadingProfile && (
              <div className="divide-y">
              {/* 나의 쇼핑 */}
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-normal text-gray-500">나의 쇼핑</h2>
              </div>
              
              {/* 나의 리뷰 */}
              <Link
                href="/profile/reviews"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">나의 리뷰</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 배송지 관리 */}
              <Link
                href="/profile/addresses"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">배송지 관리</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>


              {/* 고객센터 */}
              <div className="px-4 pt-8 pb-2">
                <h2 className="text-sm font-normal text-gray-500">고객센터</h2>
              </div>

              {/* 공지사항 */}
              <Link
                href="/notices"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">공지사항</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 자주 묻는 질문 */}
              <Link
                href="/faq"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">자주 묻는 질문</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 고객센터 */}
              <Link
                href="/support"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">고객센터</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            )}
          </>
        ) : (
          <>
            {/* 로그아웃 상태 UI */}
            <div className="bg-pink-100 rounded-lg shadow-md px-6 pt-6 pb-4 mb-6">
              <div className="mb-3">
                <Link
                  href="/auth/login?next=/profile"
                  className="flex items-center gap-2 hover:opacity-80 transition"
                >
                  <h1 className="text-lg font-medium text-black">
                    로그인
                  </h1>
                  <span className="text-4xl font-medium text-black leading-none self-center">·</span>
                  <h1 className="text-lg font-medium text-black">
                    회원가입
                  </h1>
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <p className="text-sm text-black mt-3">회원가입하고 혜택 받아가세요!</p>
                <Link
                  href="/auth/signup"
                  className="w-full mt-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-blue-950 transition flex items-center justify-between"
                >
                  <span>신규 회원 가입 혜택 보기</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* 메뉴 섹션 - 고객센터만 표시 */}
            <div className="divide-y">
              {/* 고객센터 */}
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-normal text-gray-500">고객센터</h2>
              </div>

              {/* 공지사항 */}
              <Link
                href="/notices"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">공지사항</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 자주 묻는 질문 */}
              <Link
                href="/faq"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">자주 묻는 질문</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 고객센터 */}
              <Link
                href="/support"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">고객센터</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

            </div>
          </>
        )}
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800" />
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  )
}

