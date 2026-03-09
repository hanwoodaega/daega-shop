'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils/constants'
import { getCategoryPath } from '@/lib/category/category-utils'

// 하드코딩된 메인 메뉴 (PC: 홈 숨김, 모바일: 홈 표시)
const MAIN_MENUS = [
  { name: '홈', href: '/' },
  { name: '베스트', href: '/best' },
  { name: '특가', href: '/sale' },
  { name: '선물관', href: '/gift' },
  { name: '한우대가No.9', href: '/no9' },
  { name: '리뷰이벤트', href: '/review-event' },
]

const menuLinkClass = (isActive: boolean) =>
  `flex-shrink-0 font-normal text-base sm:text-lg md:text-xl lg:text-lg transition relative group pb-1 whitespace-nowrap ${
    isActive ? 'text-red-600' : 'text-black hover:text-primary-800'
  }`

export default function MainMenu() {
  const pathname = usePathname()
  const [categoryOpen, setCategoryOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

  const handleCategoryMouseEnter = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setCategoryOpen(true)
  }

  const handleCategoryMouseLeave = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setCategoryOpen(false)
      closeTimeoutRef.current = null
    }, 150)
  }

  return (
    <div className="bg-white border-b border-gray-200 lg:border-b-2 lg:border-red-600 lg:pt-4">
      <div className="w-full max-w-[1000px] mx-auto px-3">
        <div
          className="flex flex-wrap items-center justify-between lg:justify-center gap-4 sm:gap-6 lg:gap-16 pt-2 pb-0.5 pl-1.5 pr-1.5 lg:overflow-visible"
        >
          {/* PC 전용: 카테고리 (햄버거 + 텍스트, 드롭다운) */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={handleCategoryMouseEnter}
            onMouseLeave={handleCategoryMouseLeave}
          >
            <button
              type="button"
              onClick={() => setCategoryOpen((v) => !v)}
              className={`flex items-center gap-1.5 ${menuLinkClass(false)}`}
              aria-label="카테고리 메뉴 열기"
              aria-expanded={categoryOpen}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 text-current"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>카테고리</span>
            </button>
            {categoryOpen && (
              <div className="absolute left-0 top-full mt-3 w-56 bg-white border border-gray-200 shadow-lg rounded-md z-[100]">
                <nav className="py-2">
                  {CATEGORIES.map((category) => (
                    <Link
                      key={category}
                      href={getCategoryPath(category)}
                      prefetch={false}
                      className="block px-4 py-2 text-base text-gray-800 hover:bg-gray-50 hover:text-red-600 transition"
                      onClick={() => setCategoryOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* PC 전용: 이번주 행사 (카테고리 오른쪽) */}
          <Link
            href="/weekly-discount"
            prefetch={false}
            className={`hidden lg:inline-flex relative group ${menuLinkClass(pathname === '/weekly-discount')}`}
          >
            <span>이번주 행사</span>
            <span
              className={`absolute bottom-0 h-0.5 transition-all lg:opacity-0 lg:h-0 ${
                pathname === '/weekly-discount'
                  ? 'bg-red-600 left-[-8px] right-[-8px]'
                  : 'w-0 left-0 right-0 bg-primary-800 group-hover:w-full'
              }`}
            />
          </Link>

          {MAIN_MENUS.map((menu) => {
            const isActive = pathname === menu.href
            return (
              <Link
                key={menu.name}
                href={menu.href}
                prefetch={false}
                className={`${menuLinkClass(isActive)} ${
                  menu.name === '홈' ? 'lg:hidden' : ''
                } ${menu.name === '선물관' ? 'hidden lg:inline-flex' : ''} flex-1 text-center lg:flex-none lg:text-left`}
              >
                <span>{menu.name}</span>
                <span
                  className={`absolute bottom-0 h-0.5 transition-all lg:opacity-0 lg:h-0 ${
                    isActive
                      ? 'bg-red-600 left-[-8px] right-[-8px]'
                      : 'w-0 left-0 right-0 bg-primary-800 group-hover:w-full'
                  }`}
                ></span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

