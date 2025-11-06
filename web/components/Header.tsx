'use client'

import { useCallback, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MainMenu from '@/components/MainMenu'

function HeaderContent() {
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

  return (
    <>
      {/* 첫 번째 부분: 로고, 검색창 (Normal) */}
      <div className="bg-white shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-14 gap-4">
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
        </div>
      </div>

      {/* 두 번째 부분: 메인 메뉴 (Sticky) */}
      <nav className="sticky top-0 z-50 shadow-sm bg-white">
        <Suspense fallback={<div className="h-14 bg-white border-b border-gray-200"></div>}>
          <MainMenu />
        </Suspense>
      </nav>
    </>
  )
}

export default function Header() {
  return (
    <Suspense fallback={
      <>
        <div className="bg-white shadow-md">
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
        <nav className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="container mx-auto px-4">
            <div className="h-12"></div>
          </div>
        </nav>
      </>
    }>
      <HeaderContent />
    </Suspense>
  )
}

