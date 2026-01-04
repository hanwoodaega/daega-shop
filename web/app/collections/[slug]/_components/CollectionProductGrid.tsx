'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

interface CollectionProductGridProps {
  products: Product[]
  loading: boolean
  loadingMore: boolean
  sortOrder: 'default' | 'price_asc' | 'price_desc'
  onSortOrderChange: (sort: 'default' | 'price_asc' | 'price_desc') => void
}

export default function CollectionProductGrid({
  products,
  loading,
  loadingMore,
  sortOrder,
  onSortOrderChange,
}: CollectionProductGridProps) {
  return (
    <div className="container mx-auto px-4 py-4 pt-6">
      <div className="flex justify-end items-center mb-6">
        <select
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as 'default' | 'price_asc' | 'price_desc')}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
        >
          <option value="default">최신순</option>
          <option value="price_asc">낮은 가격순</option>
          <option value="price_desc">높은 가격순</option>
        </select>
      </div>

      {/* 상품 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl text-gray-600 mb-2">
            등록된 상품이 없습니다
          </p>
          <Link href="/products">
            <button className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600 transition">
              전체 상품 보기
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          {/* 무한 스크롤 로딩 */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800"></div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

