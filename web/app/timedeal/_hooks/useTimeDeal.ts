import { useState, useEffect } from 'react'

interface TimeDealData {
  timedeal: any
  products: any[]
  title?: string
}

interface UseTimeDealReturn {
  timedealData: TimeDealData | null
  loading: boolean
}

export function useTimeDeal(): UseTimeDealReturn {
  const [timedealData, setTimedealData] = useState<TimeDealData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTimedeal = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/timedeals?limit=100')
        if (response.ok) {
          const data = await response.json()
          if (data.timedeal && data.products && data.products.length > 0) {
            setTimedealData(data)
          } else {
            setTimedealData(null)
          }
        } else {
          setTimedealData(null)
        }
      } catch (error) {
        console.error('타임딜 조회 실패:', error)
        setTimedealData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTimedeal()
  }, [])

  return {
    timedealData,
    loading,
  }
}

