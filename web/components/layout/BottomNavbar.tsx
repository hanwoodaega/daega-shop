'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCartStore, useSearchUIStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'

export default function BottomNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [mounted, setMounted] = useState(false)
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

{/* 하단 네비게이션 바 - 모바일/태블릿만 (PC에서는 미표시) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white border-t border-gray-200 shadow-lg px-2">
            <div className="flex items-center justify-around h-16">
            {/* 홈 */}
            <Link
              href="/"
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname === '/' ? 'text-red-600' : 'text-black'
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
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative ${
                pathname === '/categories' ? 'text-red-600' : 'text-black'
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
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/gift') ? 'text-red-600' : 'text-black'
              }`}
            >
              <svg className="w-6 h-6 mb-1" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="m459.483 102.373h-94.393c13.673-11.412 21.663-26.191 22.354-42.524.869-20.534-10.399-39.139-28.707-47.397-11.155-5.033-41.09-12.903-78.05 22.616-12.706 12.206-23.736 26.874-32.286 42.589-8.542-15.712-19.57-30.378-32.279-42.588-36.963-35.52-66.898-27.649-78.052-22.618-18.308 8.259-29.576 26.863-28.707 47.397.691 16.334 8.681 31.114 22.352 42.524h-79.198c-21.307 0-38.641 17.334-38.641 38.641v74.295c0 15.99 9.763 29.742 23.641 35.61v204.284c0 26.902 21.874 48.789 48.76 48.789h339.446c26.887 0 48.76-21.886 48.76-48.789v-204.284c13.878-5.868 23.641-19.62 23.641-35.61v-74.295c0-21.307-17.334-38.641-38.641-38.641zm8.641 38.641v74.295c0 4.765-3.876 8.641-8.641 8.641h-196.094v-87.253c7.964 4.96 14.946 13.978 23.788 25.965 7.675 10.406 15.611 21.166 26.064 29.47 2.759 2.192 6.051 3.256 9.321 3.256 4.417 0 8.793-1.942 11.754-5.67 5.153-6.486 4.072-15.922-2.414-21.075-7.334-5.827-13.77-14.551-20.582-23.788-2.981-4.041-6.119-8.293-9.516-12.481h157.68c4.765 0 8.641 3.876 8.641 8.641zm-166.652-84.314c12.663-12.168 25.508-18.717 36.065-18.717 3.185 0 6.164.597 8.863 1.815 7.073 3.19 11.418 10.563 11.07 18.783-.55 13.006-12.209 24.769-31.197 31.47-14.808 5.235-34.21 9.009-56.027 10.98 7.514-16.375 18.481-32.088 31.226-44.331zm-151.066-16.902c2.701-1.218 5.677-1.815 8.863-1.815 10.557 0 23.404 6.55 36.067 18.719 12.75 12.248 23.713 27.961 31.214 44.331-21.826-1.971-41.226-5.746-56.025-10.984-18.979-6.698-30.639-18.461-31.189-31.467-.348-8.22 3.998-15.593 11.07-18.783zm-106.53 101.216c0-4.765 3.876-8.641 8.641-8.641h142.483c-3.394 4.186-6.53 8.434-9.508 12.473-6.814 9.24-13.25 17.967-20.587 23.796-6.486 5.153-7.567 14.589-2.414 21.075 2.961 3.728 7.336 5.67 11.754 5.67 3.269 0 6.562-1.064 9.321-3.256 10.456-8.307 18.394-19.07 26.071-29.48 8.83-11.974 15.804-20.984 23.752-25.945v87.243h-180.872c-4.765 0-8.641-3.876-8.641-8.641v-74.295zm23.641 314.189v-201.253h165.872v220.042h-147.112c-10.344 0-18.76-8.429-18.76-18.789zm358.206 18.789h-162.334v-220.042h181.094v201.253c0 10.36-8.416 18.789-18.76 18.789z"/>
              </svg>
              <span className="text-xs">선물관</span>
            </Link>

            {/* 찜 */}
            <Link
              href="/wishlist"
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname === '/wishlist' ? 'text-red-600' : 'text-black'
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
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 py-2 ${
                pathname?.startsWith('/auth') || pathname?.startsWith('/profile') ? 'text-red-600' : 'text-black'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">마이</span>
            </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

