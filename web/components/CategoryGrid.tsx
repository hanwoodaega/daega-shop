'use client'

import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'

interface CategoryGridProps {
  selectedCategory?: string
}

export default function CategoryGrid({ selectedCategory = '전체' }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={cat === '전체' ? '/products' : `/products?category=${cat}`}
          className="flex flex-col items-center"
        >
          <div
            className={`w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition shadow-md ${
              selectedCategory === cat ? 'border-2 border-black' : ''
            }`}
          />
          <span className="text-xs font-medium text-gray-700 mt-2">{cat}</span>
        </Link>
      ))}
    </div>
  )
}

