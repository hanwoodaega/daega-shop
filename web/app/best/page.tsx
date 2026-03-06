import BestPageClient from './BestPageClient'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

export default async function BestPage() {
  let initialProducts
  let initialTotalPages

  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(
        `${siteUrl}/api/collections/best?page=1&limit=${DEFAULT_PAGE_SIZE}&sort=default`,
        { next: { revalidate: 300 } }
      )
      if (res.ok) {
        const data = await res.json()
        initialProducts = data.products || []
        initialTotalPages = data.totalPages ?? 0
      }
    }
  } catch {
    initialProducts = undefined
    initialTotalPages = undefined
  }

  return (
    <BestPageClient
      initialProducts={initialProducts}
      initialTotalPages={initialTotalPages}
    />
  )
}
