'use client'

import Link from 'next/link'
import { useCartStore } from '@/lib/store'
import { useState } from 'react'

export default function Navbar() {
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">🥩</span>
            <span className="text-xl font-bold text-gray-800">대가 정육백화점</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="text-gray-700 hover:text-primary-600 transition">
              전체상품
            </Link>
            <Link href="/products?category=한우" className="text-gray-700 hover:text-primary-600 transition">
              한우
            </Link>
            <Link href="/products?category=돼지고기" className="text-gray-700 hover:text-primary-600 transition">
              돼지고기
            </Link>
            <Link href="/products?category=수입육" className="text-gray-700 hover:text-primary-600 transition">
              수입육
            </Link>
          </div>

          {/* 장바구니 */}
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="relative">
              <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-semibold">장바구니</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </Link>

            {/* 모바일 메뉴 버튼 */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <Link href="/products" className="block py-2 text-gray-700 hover:text-primary-600">
              전체상품
            </Link>
            <Link href="/products?category=한우" className="block py-2 text-gray-700 hover:text-primary-600">
              한우
            </Link>
            <Link href="/products?category=돼지고기" className="block py-2 text-gray-700 hover:text-primary-600">
              돼지고기
            </Link>
            <Link href="/products?category=수입육" className="block py-2 text-gray-700 hover:text-primary-600">
              수입육
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

