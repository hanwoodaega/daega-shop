import { BannerUI } from './BannerUI'

interface Banner {
  id: string
  title?: string | null
  subtitle_black?: string | null
  subtitle_red?: string | null
  description?: string | null
  image_url: string
  background_color: string
  slug?: string | null
}

export default async function BannerSection() {
  try {
    // 서버 컴포넌트에서는 절대 URL 사용 권장 (Vercel, Edge, SSR 환경 대응)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // 서버에서 fetch with tags: revalidateTag('banner')로 캐시 무효화 가능
    const res = await fetch(`${siteUrl}/api/banners`, {
      next: { tags: ['banner'] },
    })
    
    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const banners: Banner[] = data.banners || []

    if (banners.length === 0) {
      return null
    }

    return <BannerUI banners={banners} />
  } catch (error: any) {
    // 빌드 시점 연결 실패는 무시 (정상적인 동작)
    // 런타임 에러만 로깅
    if (error?.code !== 'ECONNREFUSED' && error?.cause?.code !== 'ECONNREFUSED') {
      console.error('배너 조회 실패:', error)
    }
    return null
  }
}

