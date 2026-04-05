import CollectionProductsPageClient from '@/components/sections/CollectionProductsPageClient'
import { COLLECTIONS_CACHE_TAG } from '@/lib/cache/revalidate-collections-public'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function SalePage() {
  let initialData: { collection: null; products: any[]; totalPages: number } | undefined
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/sale?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
        { next: { revalidate: 300, tags: [COLLECTIONS_CACHE_TAG] } }
      )
      if (res.ok) {
        const data = await res.json()
        initialData = {
          collection: null,
          products: data.products ?? [],
          totalPages: data.totalPages ?? 0,
        }
      }
    }
  } catch {
    initialData = undefined
  }

  return (
    <CollectionProductsPageClient
      slug="sale"
      title="특가 상품"
      initialData={initialData}
      emptyMessage="할인 중인 상품이 없습니다"
      emptyLinkHref="/products"
      emptyLinkLabel="전체 상품 보기"
    />
  )
}
