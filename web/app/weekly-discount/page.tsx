import WeeklyDiscountPageClient from './WeeklyDiscountPageClient'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function WeeklyDiscountPage() {
  let initialData: { collection: any | null; products: any[]; totalPages?: number } | undefined
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
    <WeeklyDiscountPageClient initialData={initialData} />
  )
}
