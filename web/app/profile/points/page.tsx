'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { usePoints, usePointsHistory, usePointsPending } from '@/lib/swr'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils/utils'

export default function PointsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const { totalPoints, isLoading: loadingPoints } = usePoints()
  const { history, isLoading: loadingHistory } = usePointsHistory(50)
  const { pendingPoints, pendingCount, isLoading: loadingPending } = usePointsPending()
  const loading = loadingPoints || loadingHistory || loadingPending

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/profile/points')
    }
  }, [user, authLoading, router])

  const getTypeText = (type: string) => {
    switch (type) {
      case 'purchase':
        return '구매 적립'
      case 'review':
        return '리뷰 적립'
      case 'usage':
        return '포인트 사용'
      case 'referral':
        return '추천인 적립'
      case 'expired':
        return '포인트 만료'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">포인트</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
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
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 text-center">포인트</h2>
          </div>

          {/* 포인트 요약 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">보유 포인트</p>
              <p className="text-3xl font-bold text-primary-800">
                {formatPrice(totalPoints)}
              </p>
              {pendingPoints > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">적립 예정</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {formatPrice(pendingPoints)}P
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    리뷰 {pendingCount}개 승인 대기 중
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                주문 금액의 1% 적립 · 사진 리뷰 500P · 일반 리뷰 200P (작성 즉시 적립)
              </p>
            </div>
          </div>

          {/* 포인트 내역 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">포인트 내역</h2>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-10 h-10 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600">포인트 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{getTypeText(item.type)}</p>
                        <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                      </div>
                      <div className={`text-lg font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.points > 0 ? '+' : ''}{formatPrice(item.points)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">포인트</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* 모바일 전용 */}
        <div className="lg:hidden">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">보유 포인트</p>
              <p className="text-3xl font-bold text-primary-800">
                {formatPrice(totalPoints)}
              </p>
              {pendingPoints > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">적립 예정</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {formatPrice(pendingPoints)}P
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    리뷰 {pendingCount}개 승인 대기 중
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                주문 금액의 1% 적립 · 사진 리뷰 500P · 일반 리뷰 200P (작성 즉시 적립)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">포인트 내역</h2>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600">포인트 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{getTypeText(item.type)}</p>
                        <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                      </div>
                      <div className={`text-lg font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.points > 0 ? '+' : ''}{formatPrice(item.points)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

