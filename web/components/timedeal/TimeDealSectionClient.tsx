'use client'

import { useEffect } from 'react'
import { TimeDealUI } from './TimeDealUI'
import { useTimeDealStore } from '@/lib/timedeal/timedeal.store'
import { TimeDealData } from '@/lib/timedeal/timedeal.types'

interface TimeDealSectionClientProps {
  initialData: TimeDealData
  variant?: 'scroll' | 'grid'
}

/**
 * Client Component: 타임딜 UI 렌더링
 * - 서버 컴포넌트에서 받은 초기 데이터를 store에 설정
 * - store의 상태를 구독하여 실시간 업데이트
 * - 폴링은 전역에서 처리 (useTimeDealPolling)
 */
export default function TimeDealSectionClient({ initialData, variant = 'scroll' }: TimeDealSectionClientProps) {
  const { timedealData, setInitialData } = useTimeDealStore()

  // 서버에서 받은 초기 데이터를 store에 설정
  useEffect(() => {
    setInitialData(initialData)
  }, [initialData, setInitialData])

  // variant에 따라 필터링 (grid는 100개, scroll은 5개)
  // 하지만 실제로는 store에서 전체 데이터를 관리하고, UI에서 필요한 만큼만 표시
  const displayData = timedealData
    ? {
        ...timedealData,
        products: variant === 'grid' ? timedealData.products : timedealData.products.slice(0, 5),
      }
    : null

  // 타임딜이 종료되었거나 없으면 null 반환 (섹션 숨김)
  if (!displayData || !displayData.timedeal || displayData.products.length === 0) {
    return null
  }

  return <TimeDealUI data={displayData} variant={variant} />
}

