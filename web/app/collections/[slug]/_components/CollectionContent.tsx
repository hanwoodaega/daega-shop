'use client'

import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import CollectionHeader from './CollectionHeader'
import CollectionProductGrid from './CollectionProductGrid'
import { useCollectionProducts } from '../_hooks/useCollectionProducts'

export default function CollectionContent({ slug }: { slug: string }) {
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

