'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useCartStore } from '@/lib/store'

export default function NoticesPage() {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())

  // PC는 /profile/notices 사용 → 이 페이지는 모바일 전용
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) {
      router.replace('/profile/notices')
    }
  }, [router])

  const notices = [
    {
      id: 1,
      title: '신규 회원 가입 혜택 안내',
      content: '신규 회원 가입 시 첫 구매 쿠폰을 받아보세요!',
      date: '2024-01-15',
      isImportant: true,
    },
    {
      id: 2,
      title: '배송 안내',
      content: '주문 후 1-2일 내 배송이 시작됩니다.',
      date: '2024-01-10',
      isImportant: false,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일 전용 헤더 */}
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">공지사항</h1>
          </div>
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            공지사항
          </h2>
          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">공지사항이 없습니다.</div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {notice.isImportant && (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded">중요</span>
                      )}
                      <h3 className="text-base font-semibold text-gray-900">{notice.title}</h3>
                    </div>
                    <span className="text-sm text-gray-500">{notice.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{notice.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}
