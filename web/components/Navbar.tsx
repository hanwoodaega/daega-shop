'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 클라이언트에서만 렌더링되도록 설정 (Hydration 에러 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push('/products')
    }
  }

  const categories = [
    { name: '전체상품', href: '/products' },
    { name: '한우', href: '/products?category=한우' },
    { name: '돼지고기', href: '/products?category=돼지고기' },
    { name: '수입육', href: '/products?category=수입육' },
    { name: '닭', href: '/products?category=닭' },
    { name: '가공육', href: '/products?category=가공육' },
    { name: '조리육', href: '/products?category=조리육' },
    { name: '야채', href: '/products?category=야채' },
  ]

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* 첫 번째 줄: 로고, 검색창, 장바구니 */}
        <div className="flex justify-between items-center h-16 gap-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold text-primary-800 hidden sm:inline">대가 정육백화점</span>
              <span className="text-xl font-bold text-primary-800 sm:hidden">대가</span>
              <span className="text-xs text-primary-600 tracking-wider hidden sm:inline">DAEGA PREMIUM MEAT</span>
            </div>
          </Link>

          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품을 검색하세요 (예: 한우, 등심, 삼겹살)"
                className="w-full px-4 py-2 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-700 transition"
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

          {/* 장바구니, 로그인 */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/cart" className="relative">
              <button className="flex items-center space-x-2 bg-primary-800 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-900 transition shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-semibold hidden sm:inline">장바구니</span>
                {mounted && getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </Link>

            {/* 로그인/사용자 메뉴 */}
            {loading ? (
              <div className="w-8 h-8"></div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden lg:inline">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user.user_metadata?.name || '사용자'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        signOut()
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login">
                <button className="px-3 sm:px-4 py-2 text-gray-700 hover:text-primary-800 font-medium transition">
                  로그인
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* 모바일 검색창 */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품 검색..."
                className="w-full px-4 py-2 pl-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-700"
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

        {/* 두 번째 줄: 카테고리 (데스크톱) */}
        <div className="hidden md:flex items-center justify-center space-x-8 py-3 border-t border-gray-200">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="text-gray-700 hover:text-primary-800 font-medium transition relative group"
            >
              <span>{category.name}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-800 transition-all group-hover:w-full"></span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

