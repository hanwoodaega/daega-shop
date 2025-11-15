'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

interface DeliveredOrder {
  id: string
  total_amount: number
  order_items?: Array<{
    product?: {
      name: string
    }
  }>
}

export default function DeliveryCompleteNotification() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showNotification, setShowNotification] = useState(false)
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [productNames, setProductNames] = useState<string[]>([])

  useEffect(() => {
    // 관리자 페이지에서는 알림 표시하지 않음
    if (pathname?.startsWith('/admin')) {
      return
    }

    if (!user?.id) return

    const checkDeliveredOrders = async () => {
      try {
        // 이미 알림을 본 주문 ID 목록 가져오기
        const notificationKey = `delivery_notifications_${user.id}`
        const seenNotifications = JSON.parse(
          localStorage.getItem(notificationKey) || '[]'
        ) as string[]
        const seenOrderIds = new Set(seenNotifications)

        // 배송완료된 주문 조회 (구매확정 안 한 것만)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            order_items (
              product:products (
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'delivered')
          .order('created_at', { ascending: false })

        if (ordersError) {
          console.error('주문 조회 실패:', ordersError)
          return
        }

        if (!orders || orders.length === 0) {
          return
        }

        // 구매확정 여부 확인 (point_history에서 확인)
        const orderIds = orders.map((o: any) => o.id)
        const { data: confirmedOrders } = await supabase
          .from('point_history')
          .select('order_id')
          .in('order_id', orderIds)
          .eq('type', 'purchase')

        const confirmedOrderIds = new Set(
          confirmedOrders?.map((c: any) => c.order_id) || []
        )

        // 구매확정 안 한 주문만 필터링
        const unconfirmedOrders = orders.filter(
          (o: any) => !confirmedOrderIds.has(o.id) && !seenOrderIds.has(o.id)
        ) as DeliveredOrder[]

        if (unconfirmedOrders.length === 0) {
          return
        }

        // 사용한 포인트 확인하여 최종 결제 금액 계산
        const ordersWithPoints = await Promise.all(
          unconfirmedOrders.map(async (order) => {
            const { data: pointUsage } = await supabase
              .from('point_history')
              .select('points')
              .eq('order_id', order.id)
              .eq('type', 'usage')
              .single()

            const usedPoints = pointUsage ? Math.abs(pointUsage.points) : 0
            const finalAmount = order.total_amount - usedPoints
            const pointsToEarn = Math.floor(Math.max(0, finalAmount) * 0.01)

            return {
              ...order,
              pointsToEarn,
            }
          })
        )

        const totalPointsEarned = ordersWithPoints.reduce(
          (sum, order) => sum + order.pointsToEarn,
          0
        )

        // 상품명 추출
        const allProductNames: string[] = []
        ordersWithPoints.forEach((order) => {
          if (order.order_items && order.order_items.length > 0) {
            order.order_items.forEach((item) => {
              if (item.product?.name) {
                allProductNames.push(item.product.name)
              }
            })
          }
        })

        const uniqueProductNames = Array.from(new Set(allProductNames))
        const firstProductName = uniqueProductNames[0] || '상품'
        const remainingCount = uniqueProductNames.length - 1

        setDeliveredOrders(unconfirmedOrders)
        setTotalPoints(totalPointsEarned)
        setProductNames(uniqueProductNames)
        setShowNotification(true)
      } catch (error) {
        console.error('배송완료 알림 확인 실패:', error)
      }
    }

    checkDeliveredOrders()
  }, [user?.id])

  const handleClose = () => {
    if (user?.id && deliveredOrders.length > 0) {
      const notificationKey = `delivery_notifications_${user.id}`
      const seenNotifications = JSON.parse(
        localStorage.getItem(notificationKey) || '[]'
      ) as string[]
      
      // 현재 알림에 표시된 모든 주문 ID를 저장
      const orderIds = deliveredOrders.map((o: DeliveredOrder) => o.id)
      const updatedNotifications = Array.from(
        new Set([...seenNotifications, ...orderIds])
      )
      
      localStorage.setItem(
        notificationKey,
        JSON.stringify(updatedNotifications)
      )
    }
    setShowNotification(false)
  }

  const handleConfirmPurchase = () => {
    if (user?.id && deliveredOrders.length > 0) {
      const notificationKey = `delivery_notifications_${user.id}`
      const seenNotifications = JSON.parse(
        localStorage.getItem(notificationKey) || '[]'
      ) as string[]
      
      // 현재 알림에 표시된 모든 주문 ID를 저장
      const orderIds = deliveredOrders.map((o: DeliveredOrder) => o.id)
      const updatedNotifications = Array.from(
        new Set([...seenNotifications, ...orderIds])
      )
      
      localStorage.setItem(
        notificationKey,
        JSON.stringify(updatedNotifications)
      )
    }
    setShowNotification(false)
    router.push('/orders')
  }

  if (!showNotification || deliveredOrders.length === 0) {
    return null
  }

  const firstProductName = productNames[0] || '상품'
  const remainingCount = productNames.length - 1
  const productText =
    remainingCount > 0
      ? `${firstProductName} 외 ${remainingCount}개 상품`
      : firstProductName

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">배송완료 알림</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="닫기"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">{productText}</span>이(가) 배송완료되었습니다.
          </p>
          <p className="text-gray-700">
            구매확정을 누르면{' '}
            <span className="font-bold text-primary-800">
              {totalPoints.toLocaleString()}포인트
            </span>
            를 적립해드립니다.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
          >
            나중에
          </button>
          <button
            onClick={handleConfirmPurchase}
            className="flex-1 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition font-medium"
          >
            구매확정하기
          </button>
        </div>
      </div>
    </div>
  )
}

