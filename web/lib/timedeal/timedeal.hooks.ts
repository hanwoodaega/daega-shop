import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchTimeDeal } from './timedeal.service'
import { TimeDealData, TimeDealInfoForProducts } from './timedeal.types'

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
  const [title, setTitle] = useState('오늘만 특가!')
  const [description, setDescription] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)

  useEffect(() => {
    if (filter !== 'flash-sale') {
      setTitle('오늘만 특가!')
      setDescription(null)
      setEndTime(null)
      return
    }

    const fetchTimeDealInfo = async () => {
      try {
        const response = await fetch('/api/timedeals?limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.timedeal) {
            setTitle(data.timedeal.title || data.title || '오늘만 특가!')
            setDescription(data.timedeal.description || null)
            setEndTime(data.timedeal.end_at || null)
          } else {
            setTitle(data.title || '오늘만 특가!')
            setDescription(null)
            setEndTime(null)
          }
        }
      } catch (error) {
        console.error('타임딜 정보 조회 실패:', error)
        setTitle('오늘만 특가!')
        setDescription(null)
        setEndTime(null)
      }
    }

    fetchTimeDealInfo()
    
    // 1분마다 갱신
    const interval = setInterval(fetchTimeDealInfo, 60000)
    return () => clearInterval(interval)
  }, [filter])

  return {
    title,
    description,
    endTime,
  }
}


