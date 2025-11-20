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

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
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

            {/* 검색 (카테고리 + 검색 통합) */}
            <Link
              href="/categories"
              className={`flex flex-col items-center justify-center flex-1 py-2 relative ${
                pathname === '/categories' ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              {/* 검색 아이콘과 카테고리 아이콘을 합친 아이콘 */}
              <div className="relative w-6 h-6 mb-1">
                {/* 햄버거 메뉴 (카테고리 - 왼쪽에 배치, 위아래로 길게) */}
                <svg className="absolute top-0 -left-1 w-5 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 4h18M3 12h18M3 20h18" />
                </svg>
                {/* 돋보기 아이콘 (작게, 오른쪽에 배치, 배경으로 카테고리 가림) */}
                <div className="absolute -bottom-0.5 -right-1 w-[1.3rem] h-[1.3rem] z-10">
                  {/* 돋보기 배경 (카테고리 가리기) */}
                  <div className="absolute inset-0 bg-white rounded-full"></div>
                  <svg className="absolute inset-0 w-[1.3rem] h-[1.3rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                  </svg>
                </div>
              </div>
              <span className="text-xs">카테고리</span>
            </Link>

            {/* 선물 */}
            <Link
              href="/gift"
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/gift') ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span className="text-xs">선물관</span>
            </Link>

            {/* 찜 */}
            <Link
              href="/wishlist"
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname === '/wishlist' ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-xs">찜</span>
            </Link>

            {/* 마이 */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/auth') || pathname?.startsWith('/profile') ? 'text-primary-800' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">마이</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

