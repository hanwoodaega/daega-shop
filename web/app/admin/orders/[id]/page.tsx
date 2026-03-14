'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import AdminPageLayout from '../../_components/AdminPageLayout'
import OrderCard from '../_components/OrderCard'
import { Order, OrderStatus } from '../_types'

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { number: string; carrier: string }>>({})

  const fetchOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}`)
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login?next=/admin/orders')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || '주문을 불러올 수 없습니다.')
        router.push('/admin/orders')
        return
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      console.error(e)
      toast.error('주문을 불러오는 중 오류가 발생했습니다.')
      router.push('/admin/orders')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          status: newStatus,
          trackingNumber: trackingNumber || trackingInputs[orderId]?.number,
          trackingCompany: trackingInputs[orderId]?.carrier || '롯데택배',
        }),
      })
      if (res.status === 401 || res.status === 403) {
        toast.error('관리자 권한이 필요합니다.')
        router.push('/admin/login?next=/admin/orders')
        return false
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '상태 변경 실패')
      }
      await fetchOrder()
      toast.success('주문 상태가 변경되었습니다.')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
      return false
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const setTrackingNumber = (orderId: string, number: string) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: { number, carrier: prev[orderId]?.carrier || '롯데택배' },
    }))
  }
  const setTrackingCarrier = (orderId: string, carrier: string) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: { number: prev[orderId]?.number || '', carrier },
    }))
  }

  if (loading || !order) {
    return (
      <AdminPageLayout title="주문 상세">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800" />
        </div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout title="주문 상세">
      <div className="max-w-3xl mx-auto py-6 px-4 min-h-[60vh]">
        <OrderCard
          order={order}
          updatingOrderId={updatingOrderId}
          trackingInput={trackingInputs[order.id]?.number || ''}
          carrierInput={trackingInputs[order.id]?.carrier || '롯데택배'}
          onTrackingChange={(num) => setTrackingNumber(order.id, num)}
          onCarrierChange={(carrier) => setTrackingCarrier(order.id, carrier)}
          onStatusChange={handleStatusChange}
        />
      </div>
    </AdminPageLayout>
  )
}
