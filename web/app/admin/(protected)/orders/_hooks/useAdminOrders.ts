import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Order, OrderStatus, DeliveryType, OrderFilters } from '../_types'

export function useAdminOrders() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  
  const [filters, setFilters] = useState<OrderFilters>({
    deliveryType: 'all',
    date: new Date().toISOString().split('T')[0],
    startDate: null,
    endDate: null,
    status: 'all'
  })

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [processingAutoConfirm, setProcessingAutoConfirm] = useState(false)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { number: string; carrier: string }>>({})

  const redirectToLogin = useCallback(() => {
    router.push('/admin/login?next=/admin/orders')
  }, [router])

  const setFilter = useCallback(<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filters.deliveryType !== 'all') {
        params.append('delivery_type', filters.deliveryType)
      }
      if (filters.startDate && filters.endDate) {
        params.append('start_date', filters.startDate)
        params.append('end_date', filters.endDate)
      } else if (filters.date) {
        params.append('date', filters.date)
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`)

      if (response.status === 401) {
        redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error('주문 조회 실패')
      }

      const data = await response.json()
      
      if (data.error) {
        toast.error(`주문 조회에 실패했습니다\n\n${data.detail ?? data.details ?? data.error}`)
        return
      }
      
      setOrders(data)
    } catch (error) {
      console.error('❌ 주문 조회 실패:', error)
      toast.error('주문 조회에 실패했습니다', { duration: 3000 })
    } finally {
      setLoading(false)
    }
  }, [filters, redirectToLogin])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const startDate = params.get('start_date')
    const endDate = params.get('end_date')
    const date = params.get('date')
    
    if (startDate && endDate) {
      setFilters(prev => ({ ...prev, startDate, endDate, date: '' }))
    } else if (date) {
      setFilters(prev => ({ ...prev, date }))
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => {
    setUpdatingOrderId(orderId)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 쿠키 포함
          body: JSON.stringify({ 
            orderId, 
            status: newStatus,
            trackingNumber: trackingNumber || trackingInputs[orderId]?.number,
            trackingCompany: trackingInputs[orderId]?.carrier || '롯데택배',
          })
      })

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({ error: '관리자 권한이 필요합니다.' }))
        toast.error(errorData.error || '관리자 권한이 필요합니다.', { duration: 3000 })
        redirectToLogin()
        return false
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '상태 변경 실패' }))
        throw new Error(errorData.error || '상태 변경 실패')
      }

      await fetchOrders()
      toast.success('주문 상태가 변경되었습니다.', { duration: 2000 })
      return true
    } catch (error) {
      console.error('상태 변경 실패:', error)
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다.', { duration: 3000 })
      return false
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleAutoConfirm = async () => {
    setProcessingAutoConfirm(true)
    try {
      const response = await fetch('/api/admin/orders/auto-confirm', { method: 'GET' })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || '자동 구매확정 실패')

      toast.success(
        data.confirmedCount > 0
          ? `${data.confirmedCount}개 주문이 자동 구매확정되었습니다.`
          : '자동 구매확정할 주문이 없습니다.',
        { duration: 3000 }
      )
      await fetchOrders()
      return true
    } catch (error: any) {
      console.error('자동 구매확정 실패:', error)
      toast.error(`자동 구매확정에 실패했습니다.\n\n${error.message || error}`, { duration: 3000 })
      return false
    } finally {
      setProcessingAutoConfirm(false)
    }
  }

  const setTrackingNumber = (orderId: string, number: string) => {
    setTrackingInputs(prev => ({
      ...prev,
      [orderId]: { number, carrier: prev[orderId]?.carrier || '롯데택배' }
    }))
  }

  const setTrackingCarrier = (orderId: string, carrier: string) => {
    setTrackingInputs(prev => ({
      ...prev,
      [orderId]: { number: prev[orderId]?.number || '', carrier }
    }))
  }

  return {
    orders,
    loading,
    filters,
    setFilter,
    updatingOrderId,
    processingAutoConfirm,
    trackingInputs,
    setTrackingNumber,
    setTrackingCarrier,
    handleStatusChange,
    handleAutoConfirm,
    refresh: fetchOrders
  }
}

