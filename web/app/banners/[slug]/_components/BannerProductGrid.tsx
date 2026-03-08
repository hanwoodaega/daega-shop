'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

interface BannerProductGridProps {
  bannerTitle?: string
  products: Product[]
  loading: boolean
  loadingMore: boolean
}

export default function BannerProductGrid({
  bannerTitle,
  products,
  loading,
  loadingMore,
}: BannerProductGridProps) {
  return (
    <>
      {bannerTitle && (
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1">{bannerTitle}</h1>
          {products.length > 0 && (
            <p className="text-gray-600 text-sm">{products.length}개의 상품</p>
          )}
        </div>
      )}

      {/* 상품 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
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
    </>
  )
}

