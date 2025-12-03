'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 하드코딩된 메인 메뉴
const MAIN_MENUS = [
  { name: '홈', href: '/' },
  { name: '베스트', href: '/collections/best' },
  { name: '특가', href: '/collections/sale' },
  { name: '한우대가 NO.9', href: '/hanwoo-daega-no9' },
  { name: '리뷰이벤트', href: '/review-event' },
]

export default function MainMenu() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-6 sm:space-x-8 md:space-x-16 pt-2 pb-0.5 overflow-x-auto scrollbar-hide pl-2 pr-2">
          {MAIN_MENUS.map((menu) => {
            // 홈 페이지 체크
            let isActive = pathname === menu.href
            
            // 컬렉션 페이지 체크 (베스트, 특가)
            if (menu.href.startsWith('/collections/')) {
              const collectionType = menu.href.replace('/collections/', '')
              isActive = pathname === `/collections/${collectionType}`
            }
            
            const isHanwooMenu = menu.name === '한우대가 NO.9'
            
            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`font-semibold text-base sm:text-lg md:text-xl transition relative group pb-1 whitespace-nowrap flex-shrink-0 ${
                  isActive 
                    ? 'text-red-600' 
                    : isHanwooMenu
                    ? 'hover:opacity-90'
                    : 'text-gray-700 hover:text-primary-800'
                }`}
                style={isHanwooMenu && !isActive ? { color: '#4a2c1a' } : undefined}
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

