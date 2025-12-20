'use client'

import { useRouter } from 'next/navigation'

export function CartHeader() {
  const router = useRouter()

  return (
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
            장바구니
          </h1>
        </div>
        
        {/* 오른쪽: 찜 버튼 + 홈 버튼 */}
        <div className="ml-auto flex items-center gap-0">
          <button
            onClick={() => router.push('/wishlist')}
            aria-label="찜 목록"
            className="p-2 text-red-600 hover:text-red-600"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <button
            onClick={() => router.push('/')}
            aria-label="홈으로"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-8 h-8 md:w-9 md:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

