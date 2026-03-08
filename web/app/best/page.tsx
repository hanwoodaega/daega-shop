import CollectionProductsPageClient from '@/components/sections/CollectionProductsPageClient'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function BestPage() {
  let initialData: { collection: null; products: any[]; totalPages: number } | undefined
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/best?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
        { next: { revalidate: 300 } }
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
      slug="best"
      title="베스트"
      initialData={initialData}
      emptyMessage="등록된 상품이 없습니다"
      emptyLinkHref="/products"
      emptyLinkLabel="전체 상품 보기"
    />
  )
}
