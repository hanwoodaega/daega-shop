import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchTimeDeal } from './timedeal.service'
import { TimeDealData, TimeDealInfoForProducts } from './timedeal.types'
import { useTimeDealStore } from './timedeal.store'

interface UseTimeDealReturn {
  timedealData: TimeDealData | null
  loading: boolean
}

export function useTimeDeal(): UseTimeDealReturn {
  const [timedealData, setTimedealData] = useState<TimeDealData | null>(null)
  const [loading, setLoading] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadTimeDeal = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setLoading(true)
      const data = await fetchTimeDeal({ limit: 100, signal: controller.signal })
      setTimedealData(data)
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.error('타임딜 조회 실패:', error)
        setTimedealData(null)
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTimeDeal()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadTimeDeal])

  return {
    timedealData,
    loading,
  }
}

export function useTimeDealInfo(filter: string | null): TimeDealInfoForProducts {
  // store에서 타임딜 데이터 구독 (폴링 제거)
  const timedealData = useTimeDealStore((state) => state.timedealData)

  if (filter !== 'flash-sale') {
    return {
      title: '오늘만 특가!',
      description: null,
      endTime: null,
    }
  }

  // store의 타임딜 데이터를 사용
  if (timedealData?.timedeal) {
    return {
      title: timedealData.timedeal.title || timedealData.title || '오늘만 특가!',
      description: timedealData.timedeal.description || null,
      endTime: timedealData.timedeal.end_at || null,
    }
  }

  // 타임딜이 없으면 기본값
  return {
    title: '오늘만 특가!',
    description: null,
    endTime: null,
  }
}


