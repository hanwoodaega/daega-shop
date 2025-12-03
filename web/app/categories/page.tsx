'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BottomNavbar from '@/components/BottomNavbar'
import { useSearchUIStore, useCartStore } from '@/lib/store'
import { CATEGORIES } from '@/lib/constants'

// 카테고리별 SVG 파일 경로 매핑
const CATEGORY_ICONS: { [key: string]: string } = {
  '전체': '/images/categories/all.svg',
  '한우': '/images/categories/hanwoo.svg',
  '한돈': '/images/categories/pork.svg',
  '수입육': '/images/categories/imported.svg',
  '닭·오리': '/images/categories/chicken.svg',
  '가공육': '/images/categories/processed.svg',
  '양념육': '/images/categories/cooked.svg',
  '과일·야채': '/images/categories/vegetable.svg',
  '선물세트': '/images/categories/gift.svg',
}

export default function CategoriesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { isSearchOpen, openSearch, closeSearch } = useSearchUIStore()
  const cartCount = useCartStore((state) => state.getTotalItems())

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`)
      closeSearch()
      setSearchQuery('')
    } else {
      router.push('/products')
      setSearchQuery('')
    }
  }, [searchQuery, router, closeSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = searchQuery.trim()
      if (query) {
        router.push(`/products?search=${encodeURIComponent(query)}`)
        closeSearch()
        setSearchQuery('')
      } else {
        router.push('/products')
        setSearchQuery('')
      }
    }
  }, [searchQuery, router, closeSearch])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 카테고리 전용 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              카테고리
            </h1>
          </div>
          
          {/* 오른쪽: 장바구니 버튼 */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
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
        </div>
      </header>
      
      <main className="flex-1 pt-4 pb-20">
        {/* 검색 섹션 */}
        <section className="container mx-auto px-4 mb-6">
          {isSearchOpen ? (
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="상품을 검색하세요"
                  autoFocus
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-full focus:outline-none focus:border-primary-700 transition"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={openSearch}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-full text-left text-gray-500 hover:border-primary-700 transition relative"
            >
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>상품을 검색하세요</span>
            </button>
          )}
        </section>

        {/* 카테고리 섹션 */}
        <section className="container mx-auto px-4">
          <h2 className="text-sm text-gray-500 mb-4">카테고리</h2>
          <div className="grid grid-cols-2 gap-x-3">
            {['선물세트', ...CATEGORIES.filter(c => c !== '전체' && c !== '선물세트'), '전체'].map((category) => (
              <Link
                key={category}
                href={category === '전체' ? '/products' : `/products?category=${category}`}
                className="px-4 h-16 bg-white rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-3"
              >
                {CATEGORY_ICONS[category] && (
                  <Image
                    src={CATEGORY_ICONS[category]}
                    alt={category}
                    width={32}
                    height={32}
                    className="flex-shrink-0"
                  />
                )}
                <span className="text-base font-medium text-gray-900">{category}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <BottomNavbar />
    </div>
  )
}

