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
  // 클라이언트 사이드에서는 상대 경로 사용 (CORS 방지)
  // 서버 사이드에서는 절대 URL 사용 가능하지만, 클라이언트에서 호출될 수 있으므로 상대 경로 사용
  const isServer = typeof window === 'undefined'
  const url = isServer 
    ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/banners`
    : '/api/banners'
  
  const res = await fetch(url, {
    ...(isServer ? { next: { tags: ['banner'] } } : { cache: 'no-store' }),
  })
  
  if (!res.ok) {
    return { banners: [] }
  }

  const data = await res.json()
  return {
    banners: data.banners || [],
  }
}
