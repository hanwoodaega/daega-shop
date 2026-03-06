import No9PageClient from './No9PageClient'
import { getServerBaseUrl } from '@/lib/utils/server-url'

export default async function HanwooDaegaNo9Page() {
  let initialProducts
  try {
    const siteUrl = await getServerBaseUrl()
    if (siteUrl) {
      const res = await fetch(`${siteUrl}/api/collections/no9?limit=100&page=1`, {
        next: { revalidate: 300 },
      })
      if (res.ok) {
        const data = await res.json()
        initialProducts = data.products || []
      }
    }
  } catch {
    initialProducts = undefined
  }

  return <No9PageClient initialProducts={initialProducts} />
}

