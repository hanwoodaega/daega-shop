import BannerSectionUI from './BannerSectionUI'
import { getServerBaseUrl } from '@/lib/utils/server-url'

/**
 * Server Component: 배너 데이터 fetch 담당
 * - 서버에서 배너 데이터 가져오기
 * - 초기 HTML에 포함되어 SEO 최적화
 * - 서버 캐시/ISR 활용 가능
 */
export default async function BannerSection() {
  try {
    const siteUrl = getServerBaseUrl()
    
    // 서버에서 fetch with tags: revalidateTag('banner')로 캐시 무효화 가능
    if (!siteUrl) {
      return null
    }

    const res = await fetch(`${siteUrl}/api/banners`, {
      next: { tags: ['banner'], revalidate: 60 }, // 1분 캐시
    })
    
    if (!res.ok) {
      return null
    }

    const data = await res.json()

    if (!data.banners || data.banners.length === 0) {
      return null
    }

    return <BannerSectionUI banners={data.banners} />
  } catch (error: any) {
    // 빌드 시점 연결 실패는 무시 (정상적인 동작)
    // ECONNREFUSED 에러는 조용히 무시
    const isConnectionRefused = 
      error?.code === 'ECONNREFUSED' || 
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.errno === -111 ||
      error?.cause?.errno === -111
    
    if (!isConnectionRefused) {
      console.error('배너 조회 실패:', error)
    }
    return null
  }
}

