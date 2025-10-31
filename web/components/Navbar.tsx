'use client'

import { useCallback, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CATEGORY_LINKS } from '@/lib/constants'

export default function Navbar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

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

  const categories = useMemo(() => CATEGORY_LINKS, [])

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* 첫 번째 줄: 로고, 검색창 */}
        <div className="flex justify-between items-center h-16 gap-4">
          {/* 로고 */}
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

          {/* 검색창 */}
          <form onSubmit={handleSearch} className="ml-auto md:flex-1 md:max-w-2xl" id="navbar-search">
            <div className="relative">
              <input
                type="search"
                id="navbar-search-input"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                inputMode="search"
                autoComplete="off"
                enterKeyHint="search"
                data-1p-ignore
                className="w-48 sm:w-56 md:w-full px-3 py-1.5 md:px-4 md:py-2 pr-8 md:pr-10 text-base md:text-base border-2 border-gray-300 rounded-full focus:outline-none focus:border-primary-700 transition"
              />
              <svg 
                className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400"
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

