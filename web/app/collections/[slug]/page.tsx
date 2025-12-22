'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { CollectionHeader } from '@/components/collections/CollectionHeader'
import { CollectionProductGrid } from '@/components/collections/CollectionProductGrid'
import { useCollectionProducts } from '@/lib/collection/useCollectionProducts'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

function CollectionContent({ slug }: { slug: string }) {
  const {
    collection,
    products,
    loading,
    loadingMore,
    hasMore,
    sortOrder,
    setSortOrder,
  } = useCollectionProducts(slug)

  if (!collection && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <CollectionHeader title="컬렉션" />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-gray-600 mb-4">컬렉션을 찾을 수 없습니다</p>
          <Link href="/">
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600">
              홈으로 가기
            </button>
          </Link>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  const collectionTitle = collection?.title || '컬렉션'

  return (
    <div className="min-h-screen flex flex-col">
      <CollectionHeader title={collectionTitle} />
      
      <main className="flex-1">
        {/* 대표 이미지 섹션 - 이미지가 있을 때만 표시 */}
        {collection && collection.image_url && (
          <section className="relative w-full aspect-[16/9]">
            <Image
              src={collection.image_url}
              alt={collection.title || ''}
              fill
              className="object-cover"
              sizes="100vw"
              priority={false}
            />
          </section>
        )}

        <CollectionProductGrid
          products={products}
          loading={loading}
          loadingMore={loadingMore}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
        />
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                컬렉션
              </h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <CollectionContent slug={params.slug} />
    </Suspense>
  )
}

