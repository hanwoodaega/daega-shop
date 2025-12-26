import { Banner } from './banner.types'
import { Product } from '@/lib/supabase/supabase'

interface FetchBannerParams {
  slug: string
  page?: number
  limit?: number
}

export interface BannerFetchResult {
  banner: Banner | null
  products: Product[]
  totalPages: number
}

export async function fetchBannerPage({
  slug,
  page = 1,
  limit = 20,
}: FetchBannerParams): Promise<BannerFetchResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: 'default',
  })

  const res = await fetch(`/api/banners/${slug}?${params.toString()}`, {
    cache: 'no-store',
  })

  if (res.status === 404) {
    return { banner: null, products: [], totalPages: 0 }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || '배너 조회 실패')
  }

  const data = await res.json()
  return {
    banner: data.banner || null,
    products: data.products || [],
    totalPages: data.totalPages ?? 0,
  }
}

// 홈페이지용: 배너 목록 페칭
export interface FetchBannersResponse {
  banners: Banner[]
}

export async function fetchBanners(): Promise<FetchBannersResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const res = await fetch(`${siteUrl}/api/banners`, {
    next: { tags: ['banner'] },
  })
  
  if (!res.ok) {
    return { banners: [] }
  }

  const data = await res.json()
  return {
    banners: data.banners || [],
  }
}
