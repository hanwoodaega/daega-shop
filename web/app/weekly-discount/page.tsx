import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import CollectionPageClient from '@/app/collections/[slug]/CollectionPageClient'
import { COLLECTIONS_CACHE_TAG } from '@/lib/cache/revalidate-collections-public'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

/** 메뉴 `/weekly-discount` — URL 유지, 컬렉션 `type`과 동일한 slug로 조회 */
const WEEKLY_COLLECTION_SLUG = 'weekly_discount'

export default async function WeeklyDiscountPage() {
  let initialData: { collection: any | null; products: any[]; totalPages?: number } | undefined
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/${WEEKLY_COLLECTION_SLUG}?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
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
    <Suspense
      fallback={
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
      }
    >
      <CollectionPageClient slug={WEEKLY_COLLECTION_SLUG} initialData={initialData} />
    </Suspense>
  )
}
