'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES } from '@/lib/constants'

interface CategoryGridProps {
  selectedCategory?: string
}

// 카테고리별 이미지 경로 매핑
const CATEGORY_IMAGES: { [key: string]: string } = {
  '전체': '/images/categories/all.png',
  '한우': '/images/categories/hanwoo.png',
  '돼지고기': '/images/categories/pork.png',
  '수입육': '/images/categories/imported.png',
  '닭': '/images/categories/chicken.png',
  '가공육': '/images/categories/processed.png',
  '조리육': '/images/categories/cooked.png',
  '야채': '/images/categories/vegetable.png',
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
            className={`relative w-16 h-16 rounded-full bg-white overflow-hidden hover:scale-110 transition shadow-lg flex items-center justify-center ${
              selectedCategory === cat ? 'border-[3px] border-black' : ''
            }`}
          >
            {cat === '전체' ? (
              <span className="text-xl font-black text-black">ALL</span>
            ) : (
              <Image
                src={CATEGORY_IMAGES[cat] || '/images/categories/all.png'}
                alt={cat}
                fill
                className="object-cover"
                sizes="64px"
                priority={false}
              />
            )}
          </div>
          <span className={`text-sm mt-2 ${
            selectedCategory === cat 
              ? 'font-black text-red-600' 
              : 'font-medium text-gray-700'
          }`}>
            {cat}
          </span>
        </Link>
      ))}
    </div>
  )
}

