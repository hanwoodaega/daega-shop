import CollectionProductsPageClient from '@/components/sections/CollectionProductsPageClient'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function WeeklyDiscountPage() {
  let initialData: { collection: any; products: any[]; totalPages?: number } | undefined
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/weekly_discount?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
        { next: { revalidate: 300 } }
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
    <CollectionProductsPageClient
      slug="weekly_discount"
      title="이번주 행사"
      initialData={initialData}
      emptyMessage="이번 주 할인 상품이 없습니다"
      emptyLinkHref="/"
      emptyLinkLabel="홈으로 가기"
      titleFromCollection
    />
  )
}
