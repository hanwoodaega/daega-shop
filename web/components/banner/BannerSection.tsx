import BannerSectionUI from './BannerSectionUI'
import { BANNER_CACHE_TAG } from '@/lib/cache/revalidate-banners-public'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getServerBaseUrl } from '@/lib/utils/server-url'

/**
 * Server Component: 배너 데이터
 * - baseUrl 있으면 `/api/banners` + `tags: [banner]` 로 조회 (관리자 저장 시 revalidateTag와 연동)
 * - 없으면 Supabase 직접 조회 (빌드/로컬 등)
 */
export default async function BannerSection() {
  try {
    const baseUrl = await getServerBaseUrl()
    if (baseUrl) {
      const res = await fetch(`${baseUrl}/api/banners`, {
        next: { revalidate: 300, tags: [BANNER_CACHE_TAG] },
      })
      if (res.ok) {
        const data = await res.json()
        const banners = data.banners || []
        if (!banners.length) return null
        return <BannerSectionUI banners={banners} />
      }
    }

    const supabase = await createSupabaseServerClient()
    const { data: banners, error } = await supabase
      .from('banners')
      .select('id, title, subtitle_black, subtitle_red, description, image_url, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !banners?.length) {
      return null
    }

    return <BannerSectionUI banners={banners} />
  } catch (error: unknown) {
    const err = error as {
      code?: string
      errno?: number
      digest?: string
      cause?: { code?: string; errno?: number }
    }

    const isConnectionRefused =
      err?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.errno === -111 ||
      err?.cause?.errno === -111

    const isDynamicServerUsage = err?.digest === 'DYNAMIC_SERVER_USAGE'

    // 빌드 시 정적 렌더링 시도(DYNAMIC_SERVER_USAGE)나 로컬 서버 미실행(ECONNREFUSED)은 조용히 무시
    if (!isConnectionRefused && !isDynamicServerUsage) {
      console.error('배너 조회 실패:', error)
    }
    return null
  }
}

