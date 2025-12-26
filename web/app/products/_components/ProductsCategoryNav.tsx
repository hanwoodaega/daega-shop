'use client'

import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils/constants'
import { getCategoryPath } from '@/lib/category/category-utils'

interface ProductsCategoryNavProps {
  selectedCategory: string
  hasCategory: boolean
}

export default function ProductsCategoryNav({ selectedCategory, hasCategory }: ProductsCategoryNavProps) {
  const router = useRouter()

  const handleCategoryNav = (cat: string) => {
    router.push(getCategoryPath(cat))
  }

  if (!hasCategory) return null

  return (
    <nav className="sticky top-0 z-50 shadow-sm bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-start space-x-5 sm:space-x-7 md:space-x-14 pt-2 pb-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryNav(cat)}
                  className={`font-medium text-base sm:text-lg md:text-xl transition relative group pb-1.5 whitespace-nowrap flex-shrink-0 ${
                    isActive ? 'text-red-600' : 'text-gray-700 hover:text-primary-800'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`absolute -bottom-0.5 h-0.5 transition-all ${
                      isActive
                        ? 'bg-red-600 left-[-8px] right-[-8px]'
                        : 'w-0 left-0 right-0 bg-primary-800 group-hover:w-full'
                    }`}
                  ></span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

