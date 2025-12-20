'use client'

import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'

interface CollectionHeaderProps {
  title: string
}

export function CollectionHeader({ title }: CollectionHeaderProps) {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())

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
            {title}
          </h1>
        </div>
        
        {/* 오른쪽: 장바구니 버튼 */}
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
  )
}

