'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { MAIN_MENU_LINKS } from '@/lib/constants'

export default function MainMenu() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mainMenus = MAIN_MENU_LINKS

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-6 sm:space-x-8 md:space-x-16 pt-2 pb-0.5 overflow-x-auto scrollbar-hide pl-2 pr-2">
          {mainMenus.map((menu) => {
            // 홈 페이지 체크
            let isActive = pathname === menu.href
            
            // filter 파라미터가 있는 페이지 체크 (베스트, 특가, 리뷰이벤트)
            if (pathname === '/products' && menu.href.includes('filter=')) {
              const menuFilter = menu.href.split('filter=')[1]
              const currentFilter = searchParams.get('filter')
              isActive = menuFilter === currentFilter
            }
            
            // category 파라미터가 있는 페이지 체크 (한우대가 NO.9)
            if (pathname === '/products' && menu.href.includes('category=')) {
              const menuCategory = menu.href.split('category=')[1]
              const currentCategory = searchParams.get('category')
              isActive = menuCategory === currentCategory
            }
            
            const isHanwooMenu = menu.name === '한우대가 NO.9'
            
            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`font-semibold text-base sm:text-lg md:text-xl transition relative group pb-1 whitespace-nowrap flex-shrink-0 ${
                  isActive 
                    ? 'text-blue-900' 
                    : isHanwooMenu
                    ? 'hover:opacity-90'
                    : 'text-gray-700 hover:text-primary-800'
                }`}
                style={isHanwooMenu && !isActive ? { color: '#4a2c1a' } : undefined}
              >
                <span>{menu.name}</span>
                <span className={`absolute bottom-0 h-0.5 transition-all ${
                  isActive 
                    ? 'bg-blue-900 left-[-8px] right-[-8px]' 
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

