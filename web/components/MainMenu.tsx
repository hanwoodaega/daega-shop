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
        <div className="flex items-center justify-center space-x-6 sm:space-x-8 md:space-x-16 pt-3 pb-0.5">
          {mainMenus.map((menu) => {
            // 홈 페이지 체크
            let isActive = pathname === menu.href
            
            // filter 파라미터가 있는 페이지 체크 (신상품, 베스트, 전단행사, 알뜰상품)
            if (pathname === '/products' && menu.href.includes('filter=')) {
              const menuFilter = menu.href.split('filter=')[1]
              const currentFilter = searchParams.get('filter')
              isActive = menuFilter === currentFilter
            }
            
            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`font-medium text-base sm:text-lg md:text-xl transition relative group pb-1 whitespace-nowrap ${
                  isActive 
                    ? 'text-red-600' 
                    : 'text-gray-700 hover:text-primary-800'
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

