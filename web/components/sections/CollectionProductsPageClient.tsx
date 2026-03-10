'use client'

import { useCollectionProducts } from '@/lib/collection/collection.hooks'
import { Product } from '@/lib/supabase/supabase'
import { Collection } from '@/lib/collection/collection.types'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

export interface CollectionProductsPageClientProps {
  slug: string
  title: string
  initialData?: { collection: Collection | null; products: Product[]; totalPages?: number }
  emptyMessage: string
  emptyLinkHref: string
  emptyLinkLabel: string
  /** true면 title을 collection?.title ?? title 로 표시 (weekly_discount용) */
  titleFromCollection?: boolean
}

export default function CollectionProductsPageClient({
  slug,
  title,
  initialData,
  emptyMessage,
  emptyLinkHref,
  emptyLinkLabel,
  titleFromCollection = false,
}: CollectionProductsPageClientProps) {
  const {
    collection,
    products,
    loading,
    loadingMore,
    hasMore,
    sortOrder,
    setSortOrder,
    loadMore,
    error,
    retry,
  } = useCollectionProducts(slug, initialData)

  const displayTitle = titleFromCollection ? (collection?.title || title) : title

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1">{displayTitle}</h1>
            {products.length > 0 && (
              <p className="text-gray-600 text-sm">{products.length}개의 상품</p>
            )}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')
            }}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
          >
            <option value="default">최신순</option>
            <option value="price_asc">낮은 가격순</option>
            <option value="price_desc">높은 가격순</option>
          </select>
        </div>

        {error ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="px-6 py-2 bg-primary-800 text-white rounded-lg hover:opacity-90 transition"
            >
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600 mb-2">{emptyMessage}</p>
            <Link href={emptyLinkHref}>
              <button
                type="button"
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600 transition"
              >
                {emptyLinkLabel}
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
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800" />
              </div>
            )}
          </>
        )}
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}
