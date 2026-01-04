'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 하드코딩된 메인 메뉴
const MAIN_MENUS = [
  { name: '홈', href: '/' },
  { name: '베스트', href: '/best' },
  { name: '특가', href: '/sale' },
  { name: '한우대가 NO.9', href: '/no9' },
  { name: '리뷰이벤트', href: '/review-event' },
]

export default function MainMenu() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-3">
        <div className="flex items-center gap-6 sm:gap-8 pt-2 pb-0.5 pl-1.5 pr-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {MAIN_MENUS.map((menu) => {
            // 활성 페이지 체크
            const isActive = pathname === menu.href
            
            return (
              <Link
                key={menu.name}
                href={menu.href}
                prefetch={false}
                className={`flex-shrink-0 font-normal text-base sm:text-lg md:text-xl transition relative group pb-1 whitespace-nowrap ${
                  isActive 
                    ? 'text-red-600' 
                    : 'text-black hover:text-primary-800'
                }`}
              >
                <span>{menu.name}</span>
                <span className={`absolute bottom-0 h-0.5 transition-all ${
                  isActive 
                    ? 'bg-red-600 left-[-8px] right-[-8px]' 
                    : 'w-0 left-0 right-0 bg-primary-800 group-hover:w-full'
                }`}></span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

