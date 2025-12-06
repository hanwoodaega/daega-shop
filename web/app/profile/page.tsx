'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { getUserCoupons } from '@/lib/coupons'
import { useCartStore } from '@/lib/store'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [orderCount, setOrderCount] = useState(0)
  const [points, setPoints] = useState(0)
  const [couponCount, setCouponCount] = useState(0)
  const [giftCount, setGiftCount] = useState(0)
  const cartCount = useCartStore((state) => state.getTotalItems())

  useEffect(() => {
    if (!loading) {
      if (user?.id) {
        loadUserProfile()
      } else {
        setLoadingProfile(false)
      }
    }
  }, [user?.id, loading, user]) // ✅ user.id만 의존성으로 (무한 루프 방지)

  const loadUserProfile = async () => {
    try {
      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('타임아웃')), 5000)
      })

      const profilePromise = Promise.all([
        // 사용자 이름
        supabase
          .from('users')
          .select('name')
          .eq('id', user!.id)
          .single(),
        // 주문 내역 개수
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        // 포인트 (API를 통해 조회)
        fetch('/api/points').then(res => res.json()).catch(() => ({ userPoints: { total_points: 0 } })),
        // 쿠폰 개수
        getUserCoupons(user!.id, false).catch(() => []),
      ])

      const [userData, ordersData, pointsResponse, couponsData] = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any[]

      if (userData?.error) throw userData.error
      setUserName(userData?.data?.name || user!.user_metadata?.name || user!.email?.split('@')[0] || '사용자')

      setOrderCount(ordersData?.count || 0)
      setPoints(pointsResponse?.userPoints?.total_points || 0)
      setCouponCount(couponsData?.length || 0)
      // 선물함 개수 - gifts 테이블이 없으므로 0으로 설정
      setGiftCount(0)
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      setUserName(user!.user_metadata?.name || user!.email?.split('@')[0] || '사용자')
      // 기본값 설정
      setOrderCount(0)
      setPoints(0)
      setCouponCount(0)
      setGiftCount(0)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
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
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">마이페이지</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 마이 전용 헤더 */}
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
          
          {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              마이페이지
            </h1>
          </div>
          
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-24">
        {user ? (
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

            {/* 메뉴 섹션 */}
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

              {/* 간편 결제 관리 */}
              <Link
                href="/profile/payment"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">간편 결제 관리</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 알림 설정 */}
              <Link
                href="/notifications"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-base font-medium text-gray-900">알림 설정</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">알림 설정하고 혜택받기</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
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
                <p className="text-sm text-black mt-3">회원가입하고 첫구매 쿠폰 받아가세요!</p>
                <Link
                  href="/auth/signup/terms"
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
      </main>

      <BottomNavbar />
    </div>
  )
}

