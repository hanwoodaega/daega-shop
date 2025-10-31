'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      setIsSearchFocused(false)
      router.push(`/products?search=${encodeURIComponent(query)}`)
      // 검색어는 URL에 있으므로 유지
    } else {
      setIsSearchFocused(false)
      router.push('/products')
      setSearchQuery('')
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
        {/* 첫 번째 줄: 로고, 검색창 */}
        <div className={`flex items-center h-16 transition-all duration-300 ${isSearchFocused ? 'justify-center' : 'justify-between gap-4'}`}>
          {/* 로고 */}
          {!isSearchFocused && (
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
          )}

          {/* 검색창 */}
          <form onSubmit={handleSearch} className={`transition-all duration-300 ${isSearchFocused ? 'max-w-2xl w-full' : 'ml-auto md:flex-1 md:max-w-2xl'}`} id="navbar-search">
            <div className="relative">
              <input
                type="text"
                id="navbar-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`px-3 py-1.5 md:px-4 md:py-2 pr-8 md:pr-10 text-base md:text-base border-2 border-gray-300 rounded-full focus:outline-none focus:border-primary-700 transition-all duration-300 ${
                  isSearchFocused ? 'w-full max-w-[360px] sm:max-w-[480px] md:max-w-2xl' : 'w-48 sm:w-56 md:w-full'
                }`}
              />
              {!isSearchFocused && (
                <svg 
                  className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
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

