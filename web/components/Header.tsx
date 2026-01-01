'use client'

import { useCallback, useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import MainMenu from '@/components/MainMenu'
import NotificationBell from '@/components/NotificationBell'
import { useWishlistStore, useSearchUIStore, useCartStore } from '@/lib/store'

function HeaderContent({ hideMainMenu = false, showCartButton = false, sticky = false }: { hideMainMenu?: boolean, showCartButton?: boolean, sticky?: boolean }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { isSearchOpen, closeSearch } = useSearchUIStore()
  const cartCount = useCartStore((state) => state.getTotalItems())

  const performSearch = useCallback(() => {
    const query = searchQuery.trim()
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`)
      // 검색어는 URL에 있으므로 유지
    } else {
      router.push('/products')
      setSearchQuery('')
    }
  }, [searchQuery, router])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }, [performSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      performSearch()
    }
  }, [performSearch])

  // 검색 모드가 닫힐 때 검색어 초기화 (옵션)
  useEffect(() => {
    if (!isSearchOpen) {
      // setSearchQuery('') // 필요시 활성화
    }
  }, [isSearchOpen])

  return (
    <>
      {/* 첫 번째 부분: 로고, 검색창 (Normal) */}
      <div className={`relative ${sticky ? 'sticky top-0 z-50' : ''} bg-white border-b border-gray-200`}>
        {/* 콘텐츠 */}
        <div className="relative z-10 container mx-auto pl-2 pr-4">
          <div className="flex items-center justify-start h-16 gap-4">
            {/* 로고 */}
            <Link href="/" prefetch={false} className="flex-shrink-0 z-20 flex items-center" aria-label="홈으로 이동">
              <Image
                src="/images/logo.png"
                alt="대가정육마트 로고"
                width={160}
                height={48}
                className="object-contain scale-x-[0.9]"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>
            {isSearchOpen ? (
              <>
                {/* 검색 모드 */}
                <form onSubmit={(e) => { handleSearch(e); closeSearch() }} className="flex-1">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      handleKeyDown(e)
                      if (e.key === 'Escape') {
                        closeSearch()
                      }
                    }}
                    placeholder="검색어를 입력하세요"
                    autoFocus
                    className="w-full px-4 py-2 text-base border-2 border-gray-300 rounded-full focus:outline-none focus:border-primary-700 transition bg-white"
                  />
                </form>
                <button
                  onClick={closeSearch}
                  className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                  aria-label="닫기"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* 일반 모드 */}
                <div className="ml-auto flex items-center relative z-20">
                  {/* 알림 종모양 */}
                  <NotificationBell />

                  {/* 장바구니 아이콘 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push('/cart')
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition relative z-30"
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* 두 번째 부분: 메인 메뉴 (Sticky) */}
      {!hideMainMenu && (
        <nav className="sticky top-0 z-50 shadow-sm bg-white">
          <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200"></div>}>
            <MainMenu />
          </Suspense>
        </nav>
      )}
    </>
  )
}

export default function Header({ hideMainMenu = false, showCartButton = false, sticky = false }: { hideMainMenu?: boolean, showCartButton?: boolean, sticky?: boolean }) {
  return (
    <Suspense fallback={
      <>
        <div className={`relative ${sticky ? 'sticky top-0 z-50' : ''} bg-white border-b border-gray-200`}>
          <div className="relative z-10 container mx-auto pl-2 pr-4">
            <div className="flex items-center h-16 gap-4">
              <Link href="/" prefetch={false} className="flex-shrink-0 z-20" aria-label="홈으로 이동">
                <Image
                  src="/images/logo.png"
                  alt="대가정육마트 로고"
                  width={160}
                  height={48}
                  className="object-contain scale-x-[0.9]"
                  style={{ width: 'auto', height: 'auto' }}
                  priority
                />
              </Link>
            </div>
          </div>
        </div>
        {!hideMainMenu && (
          <nav className="sticky top-0 z-50 bg-white shadow-sm">
            <div className="container mx-auto px-4">
              <div className="h-12"></div>
            </div>
          </nav>
        )}
      </>
    }>
      <HeaderContent hideMainMenu={hideMainMenu} showCartButton={showCartButton} sticky={sticky} />
    </Suspense>
  )
}

