import TimeDealSectionClient from './TimeDealSectionClient'

interface TimeDealSectionProps {
  variant?: 'scroll' | 'grid' // 'scroll': 가로 스크롤 (기본), 'grid': 2열 그리드
}

/**
 * Server Component: 타임딜 데이터 fetch 담당
 * - 서버에서 타임딜 존재 여부 확인
 * - 초기 HTML에 포함되어 SEO 최적화
 * - 서버 캐시/ISR 활용 가능
 */
export default async function TimeDealSection({ variant = 'scroll' }: TimeDealSectionProps) {
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

    // Client Component에 초기 데이터 전달
    // Client Component가 실시간 업데이트 및 종료 감지 담당
    return <TimeDealSectionClient initialData={data} variant={variant} />
  } catch (error: any) {
    // 빌드 시점 연결 실패는 무시 (정상적인 동작)
    // ECONNREFUSED 에러는 조용히 무시
    const isConnectionRefused = 
      error?.code === 'ECONNREFUSED' || 
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.errno === -111 ||
      error?.cause?.errno === -111
    
    if (!isConnectionRefused) {
      console.error('타임딜 상품 조회 실패:', error)
    }
    return null
  }
}

