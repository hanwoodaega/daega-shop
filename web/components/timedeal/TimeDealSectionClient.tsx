'use client'

import { useEffect, useState } from 'react'
import { TimeDealUI } from './TimeDealUI'

interface TimeDealData {
  timedeal: {
    id: string
    title?: string | null
    description?: string | null
    end_at?: string | null
  }
  products: any[]
  title?: string
}

interface TimeDealSectionClientProps {
  initialData: TimeDealData
  variant?: 'scroll' | 'grid'
}

/**
 * Client Component: 실시간 업데이트 및 종료 감지 담당
 * - 실시간으로 타임딜 종료 여부 확인 (1분마다)
 * - 종료 시 자동으로 숨김 처리
 */
export default function TimeDealSectionClient({ initialData, variant = 'scroll' }: TimeDealSectionClientProps) {
  const [timedealData, setTimedealData] = useState<TimeDealData | null>(initialData)

  // initialData 변경 대응 (ISR revalidate, soft navigation 등)
  useEffect(() => {
    setTimedealData(initialData)
  }, [initialData])

  useEffect(() => {
    // 타임딜이 없으면 체크할 필요 없음
    if (!initialData?.timedeal) {
      return
    }

    let interval: NodeJS.Timeout | null = null

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const checkTimedealStatus = async () => {
      try {
        const limit = variant === 'grid' ? 100 : 5
        const response = await fetch(`/api/timedeals?limit=${limit}`, {
          cache: 'no-store',
        })
        
        if (response.ok) {
          const data = await response.json()
          // 서버에서 이미 종료 판단을 수행하므로, timedeal이 null이면 종료된 것
          if (data.timedeal && data.products && data.products.length > 0) {
            setTimedealData(data)
          } else {
            // 타임딜 종료됨 - 숨김 처리 및 polling 완전 중단
            setTimedealData(null)
            stopPolling()
          }
        } else {
          // 에러 발생 시에도 기존 데이터 유지 (안정성)
          setTimedealData(null)
        }
      } catch (error) {
        console.error('타임딜 상태 확인 실패:', error)
        // 에러 발생 시에도 기존 데이터 유지
      }
    }

    const startPolling = () => {
      // 이미 실행 중이면 중지
      if (interval) {
        clearInterval(interval)
      }
      // 즉시 한 번 체크 (페이지 활성화 시)
      checkTimedealStatus()
      // 그 다음부터 1분마다 체크
      interval = setInterval(checkTimedealStatus, 60000)
    }

    // 탭 활성화 상태에 따라 제어
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling()
      } else {
        stopPolling()
      }
    }

    // 초기 polling 시작
    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [initialData, variant])

  // 타임딜이 종료되었거나 없으면 null 반환 (섹션 숨김)
  if (!timedealData) {
    return null
  }

  return <TimeDealUI data={timedealData} variant={variant} />
}

