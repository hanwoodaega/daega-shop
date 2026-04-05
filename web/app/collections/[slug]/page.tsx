import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import CollectionPageClient from './CollectionPageClient'
import { COLLECTIONS_CACHE_TAG } from '@/lib/cache/revalidate-collections-public'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let initialData: { collection: any | null; products: any[]; totalPages?: number } | undefined
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/${slug}?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
        { next: { revalidate: 300, tags: [COLLECTIONS_CACHE_TAG] } }
      )
      if (res.ok) {
        const data = await res.json()
        initialData = {
          collection: data.collection ?? null,
          products: data.products ?? [],
          totalPages: data.totalPages ?? 0,
        }
      }
    }
  } catch {
    initialData = undefined
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <CollectionPageClient slug={slug} initialData={initialData} />
    </Suspense>
  )
}
