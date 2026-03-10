'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import { useCollectionProducts } from '@/lib/collection'
import { Collection } from '@/lib/collection'
import { Product } from '@/lib/supabase/supabase'
import CollectionDescription from './_components/CollectionDescription'
import CollectionProductGrid from './_components/CollectionProductGrid'

interface CollectionPageClientProps {
  slug: string
  initialData?: { collection: Collection | null; products: Product[]; totalPages?: number }
}

export default function CollectionPageClient({ slug, initialData }: CollectionPageClientProps) {
  const {
    collection,
    products,
    loading,
    loadingMore,
    hasMore,
    sortOrder,
    setSortOrder,
  } = useCollectionProducts(slug, initialData)

  const collectionTitle = collection?.title || '컬렉션'

  if (!collection && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {collection && (
          <CollectionDescription
            image_url={collection.image_url}
          />
        )}

        <CollectionProductGrid
          collectionTitle={collectionTitle}
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

