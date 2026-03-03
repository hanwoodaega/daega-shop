import BannerSectionUI from './BannerSectionUI'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

/**
 * Server Component: 배너 데이터 fetch 담당
 * - 서버에서 Supabase 직접 조회 (URL 의존 없음, 배포 환경에서도 동작)
 * - 초기 HTML에 포함되어 SEO 최적화
 */
export default async function BannerSection() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: banners, error } = await supabase
      .from('banners')
      .select('id, title, subtitle_black, subtitle_red, description, image_url, background_color, slug')
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

