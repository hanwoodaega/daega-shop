'use client'

import { useCallback, useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MainMenu from '@/components/MainMenu'
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
      <div className={`bg-white shadow-md ${sticky ? 'sticky top-0 z-50' : ''}`}>
        <div className="container mx-auto pl-6 pr-4">
          <div className="flex justify-between items-center h-14 gap-4">
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
                    className="w-full px-4 py-2 text-base border-2 border-gray-300 rounded-full focus:outline-none focus:border-primary-700 transition"
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
                <Link 
                  href="/" 
                  className="flex items-center space-x-2 flex-shrink-0"
                >
                  <div className="flex flex-col leading-none">
                    <span className="text-xl font-bold text-primary-800 hidden sm:inline">대가 정육백화점</span>
                    <span className="text-xl font-bold text-primary-800 sm:hidden">대가축산</span>
                    <span className="text-xs text-primary-600 tracking-wider hidden sm:inline">DAEGA PREMIUM MEAT</span>
                  </div>
                </Link>

                <div className="ml-auto flex items-center">
                  {/* 검색 아이콘 */}
                  <button
                    onClick={() => useSearchUIStore.getState().openSearch()}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                    aria-label="검색"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>

                  {/* 위시리스트 아이콘 */}
                  <button
                    onClick={() => router.push('/wishlist')}
                    className="p-2 hover:bg-gray-100 rounded-full transition relative"
                    aria-label="찜 목록"
                  >
                    <svg className="w-7 h-7 md:w-8 md:h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  {/* 장바구니 아이콘 (상품 상세 페이지에서만 표시) */}
                  {showCartButton && (
                    <button
                      onClick={() => router.push('/cart')}
                      className="p-2 hover:bg-gray-100 rounded-full transition relative"
                      aria-label="장바구니"
                    >
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {cartCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 두 번째 부분: 메인 메뉴 (Sticky) */}
      {!hideMainMenu && (
        <nav className="sticky top-0 z-50 shadow-sm bg-white">
          <Suspense fallback={<div className="h-14 bg-white border-b border-gray-200"></div>}>
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
        <div className={`bg-white shadow-md ${sticky ? 'sticky top-0 z-50' : ''}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-14 gap-4">
              <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-bold text-primary-800 hidden sm:inline">대가 정육백화점</span>
                  <span className="text-xl font-bold text-primary-800 sm:hidden">대가축산</span>
                  <span className="text-xs text-primary-600 tracking-wider hidden sm:inline">DAEGA PREMIUM MEAT</span>
                </div>
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

