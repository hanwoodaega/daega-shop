import { TimeDealUI } from './TimeDealUI'

interface TimeDealSectionProps {
  variant?: 'scroll' | 'grid' // 'scroll': 가로 스크롤 (기본), 'grid': 2열 그리드
}

export default async function TimeDealSection({ variant = 'scroll' }: TimeDealSectionProps) {
  // 빌드 시점에는 fetch를 건너뜀 (서버가 실행되지 않음)
  const isBuildTime = !process.env.NEXT_PHASE || process.env.NEXT_PHASE === 'phase-production-build'
  
  if (isBuildTime) {
    return null
  }

  try {
    // grid 모드일 때는 더 많은 상품을 가져옴
    const limit = variant === 'grid' ? 100 : 5
    
    // 서버 컴포넌트에서는 절대 URL 사용 권장 (Vercel, Edge, SSR 환경 대응)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // 서버에서 fetch with tags: revalidateTag('timedeal')로 캐시 무효화 가능
    const res = await fetch(`${siteUrl}/api/timedeals?limit=${limit}`, {
      next: { tags: ['timedeal'] },
    })
    
    if (!res.ok) {
      return null
    }

    const data = await res.json()

    // 서버에서 이미 종료 판단을 수행하므로, timedeal이 null이면 종료된 것
    if (!data.timedeal || !data.products || data.products.length === 0) {
      return null
    }

    return <TimeDealUI data={data} variant={variant} />
  } catch (error: any) {
    return null
  }
}

