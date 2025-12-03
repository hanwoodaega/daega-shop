'use client'

import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useCartStore } from '@/lib/store'

export default function SupportPage() {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())

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
              고객센터
            </h1>
          </div>
          
          {/* 오른쪽: 장바구니 버튼 */}
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
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">

        <div className="space-y-4">
          {/* 고객센터 연락처 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              고객센터 연락처
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-900 font-medium">전화: 010-3941-1223</p>
              <p className="text-gray-600">운영시간: 평일 10:00 ~ 18:00</p>
              <p className="text-gray-600">(주말 및 공휴일 휴무)</p>
            </div>
          </div>

          {/* 매장 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              매장 정보
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-900 font-medium">대가정육마트</p>
              <p className="text-gray-600">주소: 전라남도 순천시 해룡면</p>
              <p className="text-gray-600">영업시간: 매일 10:00 ~ 20:00</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

