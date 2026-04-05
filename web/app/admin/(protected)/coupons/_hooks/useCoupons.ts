import { useState, useEffect } from 'react'
import { Coupon } from '@/lib/supabase/supabase'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)

  const fetchCoupons = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApiFetch('/api/admin/coupons')
      
      if (res.status === 401) {
        setError({ status: 401, message: '인증이 필요합니다.' })
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const status = res.status
        const message = errorData.error || '쿠폰 조회 실패'
        setError({ status, message })
        return
      }

      const data = await res.json()
      setCoupons(data.coupons || [])
      setError(null)
    } catch (err: any) {
      console.error('쿠폰 조회 실패:', err)
      setError({ status: 500, message: err.message || '쿠폰 조회 실패' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  return {
    coupons,
    loading,
    error, // 에러 상태 반환 (page에서 router.push 처리)
    refetch: fetchCoupons,
  }
}

