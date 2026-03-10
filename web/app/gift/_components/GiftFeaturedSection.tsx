'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { getCategoryPath } from '@/lib/category/category-utils'

interface GiftFeaturedSectionProps {
  products: Product[]
  loading: boolean
}

export default function GiftFeaturedSection({ products, loading }: GiftFeaturedSectionProps) {
  return (
    <section className="container mx-auto px-4 mb-8">
      <h2 className="text-lg font-semibold mb-4">실시간 인기 선물세트</h2>
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40 lg:w-auto">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-40 lg:w-auto">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          {/* 전체보기 버튼 */}
          <div className="mt-4">
            <Link href={getCategoryPath('선물세트')} className="block">
              <button className="w-full px-6 py-2.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <span>전체보기</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>선물세트 상품이 없습니다.</p>
        </div>
      )}
    </section>
  )
}

