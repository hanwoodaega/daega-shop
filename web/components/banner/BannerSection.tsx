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
  // 빌드 시점에는 fetch를 건너뜀 (서버가 실행되지 않음)
  const isBuildTime = !process.env.NEXT_PHASE || process.env.NEXT_PHASE === 'phase-production-build'
  
  if (isBuildTime) {
    return null
  }

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
    return null
  }
}

