"use client"

import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES } from '@/lib/utils/constants'
import { getCategoryPath } from '@/lib/category/category-utils'

interface CategoryGridProps {
  selectedCategory?: string
}

// 카테고리별 이미지 경로 매핑
const CATEGORY_IMAGES: { [key: string]: string } = {
  '전체': '/images/categories/all.png',
  '한우': '/images/categories/hanwoo.png',
  '한돈': '/images/categories/pork.png',
  '수입육': '/images/categories/imported.png',
  '닭·오리': '/images/categories/chicken.png',
  '양념육': '/images/categories/cooked.png',
  '가공육': '/images/categories/processed.png',
  '바베큐': '/images/categories/bbq.png',
  '과일·야채': '/images/categories/vegetable.png',
  '선물세트': '/images/categories/gift.png',
}

export default function CategoryGrid({ selectedCategory = '전체' }: CategoryGridProps) {
  return (
    <div className="w-full bg-gray-100 lg:bg-white">
      <div className="max-w-[1000px] mx-auto px-4 py-3">
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-4">
          {CATEGORIES.map((cat, idx) => (
            <Link
              key={cat}
              href={getCategoryPath(cat)}
              className="flex flex-col items-center"
            >
              <div className="relative w-[60px] h-[60px] lg:w-[72px] lg:h-[72px] rounded-2xl bg-white overflow-hidden hover:scale-110 transition flex items-center justify-center">
                {cat === '전체' ? (
                  <span className="text-2xl font-black text-black tracking-tight">ALL</span>
                ) : (
                  <Image
                    src={CATEGORY_IMAGES[cat] || CATEGORY_IMAGES['한우']}
                    alt={cat}
                    fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 72px, 60px"
                    priority={idx < 5}
                  />
                )}
              </div>
              <span
                className={`text-sm mt-2 ${
                  selectedCategory === cat ? 'font-black text-red-600' : 'font-medium text-gray-700'
                }`}
              >
                {cat}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

