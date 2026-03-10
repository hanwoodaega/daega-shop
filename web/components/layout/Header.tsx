'use client'

import { useCallback, useState, Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import MainMenu from '@/components/layout/MainMenu'
import NotificationBell from '@/components/common/NotificationBell'
import { useSearchUIStore, useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { useProfileInfo } from '@/lib/swr'

function HeaderContent({ hideMainMenu = false, showCartButton = false, sticky = false }: { hideMainMenu?: boolean, showCartButton?: boolean, sticky?: boolean }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [menuFixed, setMenuFixed] = useState(false)
  const [menuBarHeight, setMenuBarHeight] = useState(56)
  const headerAboveNavRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const { isSearchOpen, closeSearch } = useSearchUIStore()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const { user, loading } = useAuth()
  const { data: profileInfo } = useProfileInfo()
  const displayName = profileInfo?.name ?? (user as any)?.user_metadata?.name ?? ''

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

  useEffect(() => {
    setMounted(true)
  }, [])

  // PC: 스크롤 시 메인메뉴만 상단 고정 (fixed)
  useEffect(() => {
    if (hideMainMenu) return
    const onScroll = () => {
      if (typeof window === 'undefined') return
      const isLg = window.innerWidth >= 1024
      if (!isLg) {
        setMenuFixed(false)
        return
      }
      const headerHeight = headerAboveNavRef.current?.offsetHeight ?? 120
      if (window.scrollY > headerHeight) {
        if (!menuFixed && navRef.current) {
          setMenuBarHeight(navRef.current.offsetHeight)
        }
        setMenuFixed(true)
      } else {
        setMenuFixed(false)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [hideMainMenu, menuFixed])

  return (
    <>
      <div ref={headerAboveNavRef}>
      {/* PC 전용 상단 유틸 바 */}
      <div className="hidden lg:block bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-end items-center h-11 gap-4 text-sm text-gray-700">
            {!loading && !user && (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="hover:text-red-600 transition"
                >
                  로그인
                </button>
                <span className="text-gray-300">│</span>
                <button
                  type="button"
                  onClick={() => router.push('/auth/signup')}
                  className="hover:text-red-600 transition"
                >
                  회원가입
                </button>
                <span className="text-gray-300">│</span>
                <button
                  type="button"
                  onClick={() => router.push('/order-lookup')}
                  className="hover:text-red-600 transition"
                >
                  주문조회
                </button>
                <span className="text-gray-300">│</span>
                <button
                  type="button"
                  onClick={() => router.push('/support')}
                  className="hover:text-red-600 transition"
                >
                  고객센터
                </button>
              </>
            )}
            {!loading && user && (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="hover:text-red-600 transition"
                >
                  {displayName || '마이페이지'}님
                </button>
                <span className="text-gray-300">│</span>
                <button
                  type="button"
                  onClick={() => router.push('/support')}
                  className="hover:text-red-600 transition"
                >
                  고객센터
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 첫 번째 부분: 로고, 검색창 (Normal) */}
      <div className="relative bg-white border-b border-gray-200 lg:border-b-0 lg:pb-3">
        {/* 콘텐츠 */}
        <div className="relative z-10 container mx-auto pl-6 pr-4">
          <div className="flex items-center justify-start h-16 gap-4">
            {/* 로고 */}
            <Link
              href="/"
              prefetch={false}
              className="flex-shrink-0 z-20 flex items-center -ml-6 lg:ml-0"
              aria-label="홈으로 이동"
            >
              <Image
                src="/images/logo.png"
                alt="대가정육마트 로고"
                width={160}
                height={48}
                className="object-contain scale-x-[0.85]"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>
            {/* PC 전용: 로고 오른쪽 검색창 */}
            <form
              onSubmit={(e) => { handleSearch(e); }}
              className="hidden lg:flex flex-1 max-w-lg mx-4 relative items-center"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="검색어를 입력해주세요"
                className="w-full pl-4 pr-12 py-2.5 text-lg border border-gray-300 rounded-full focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 bg-gray-50 lg:bg-white"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                aria-label="검색"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
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
                    placeholder="검색어를 입력해주세요"
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
                        mounted && cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                      }`}
                      suppressHydrationWarning
                      aria-hidden={cartCount <= 0}
                    >
                      {mounted ? (cartCount > 99 ? '99+' : cartCount) : ''}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 두 번째 부분: 메인 메뉴 (PC: 화면 전체 너비 + 스크롤 시 fixed 고정) */}
      {!hideMainMenu && (
        <div className="lg:relative lg:left-1/2 lg:right-1/2 lg:-ml-[50vw] lg:-mr-[50vw] lg:w-screen">
          <nav
            ref={navRef}
            className={`w-full z-50 shadow-sm bg-white ${menuFixed ? 'lg:fixed lg:top-0 lg:left-0 lg:right-0' : ''}`}
          >
            <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200"></div>}>
              <MainMenu />
            </Suspense>
          </nav>
          {menuFixed && <div style={{ height: menuBarHeight }} aria-hidden />}
        </div>
      )}
    </>
  )
}

export default function Header({ hideMainMenu = false, showCartButton = false, sticky = false }: { hideMainMenu?: boolean, showCartButton?: boolean, sticky?: boolean }) {
  return (
    <Suspense fallback={
      <>
        <div className="relative bg-white border-b border-gray-200">
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

