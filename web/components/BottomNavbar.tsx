'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCartStore, useSearchUIStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES } from '@/lib/constants'

export default function BottomNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [mounted, setMounted] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 스크롤 방향 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // 스크롤이 최상단일 때는 항상 표시
      if (currentScrollY < 10) {
        setIsVisible(true)
      } 
      // 스크롤 올릴 때 표시
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      } 
      // 스크롤 내릴 때 숨김
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
      setShowSearchModal(false)
      setSearchQuery('')
    }
  }, [searchQuery, router])

  const categories = useMemo(() => CATEGORIES.map(cat => ({
    name: cat,
    href: cat === '전체' ? '/products' : `/products?category=${cat}`
  })), [])

  return (
    <>
      {/* 검색 모달 */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
          <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">상품 검색</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchQuery('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상품을 검색하세요"
                  className="w-full px-4 py-3 pl-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-700"
                  autoFocus
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 메뉴 모달 */}
      {showCategoryMenu && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCategoryMenu(false)}>
          <div className="fixed bottom-20 left-0 right-0 bg-white rounded-t-xl shadow-xl p-6 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">카테고리</h3>
              <button
                onClick={() => setShowCategoryMenu(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  onClick={() => setShowCategoryMenu(false)}
                  className="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition"
                >
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {/* 홈 */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname === '/' ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">홈</span>
            </Link>

            {/* 카테고리 */}
            <button
              onClick={() => setShowCategoryMenu(true)}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/products') ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs">카테고리</span>
            </button>

            {/* 검색 */}
            <button
              onClick={() => {
                // 검색 모드 열기
                useSearchUIStore.getState().openSearch()
                // 상단으로 스크롤
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex flex-col items-center justify-center flex-1 py-2 text-gray-600"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs">검색</span>
            </button>

            {/* 사용자 */}
            <Link
              href={user ? '/profile' : '/auth/login'}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/auth') || pathname?.startsWith('/profile') ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">MY</span>
            </Link>

            {/* 장바구니 */}
            <Link
              href="/cart"
              className={`relative flex flex-col items-center justify-center flex-1 py-2 ${
                pathname === '/cart' ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs">장바구니</span>
              {mounted && getTotalItems() > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

