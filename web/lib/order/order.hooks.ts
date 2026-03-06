import { useState, useEffect, useCallback } from 'react'
import { OrderWithItems } from './order-types'
import { fetchOrders, cancelOrder, confirmOrder } from './order.service'
import { showError, showSuccess } from '@/lib/utils/error-handler'
import { formatPrice } from '@/lib/utils/utils'

interface UseOrdersParams {
  userId?: string | null
  giftToken?: string | null
}

interface UseOrdersReturn {
  orders: OrderWithItems[]
  loadingOrders: boolean
  cancelingOrderId: string | null
  confirmingOrderId: string | null
  expandedOrders: Set<string>
  giftOrder: OrderWithItems | null
  toggleOrderExpand: (orderId: string) => void
  handleCancelOrder: (orderId: string) => Promise<void>
  handleTrackDelivery: (order: OrderWithItems) => void
  handleConfirmPurchase: (orderId: string) => Promise<void>
}

export function useOrders({ userId, giftToken }: UseOrdersParams): UseOrdersReturn {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [giftOrder, setGiftOrder] = useState<OrderWithItems | null>(null)

  const loadOrders = useCallback(async () => {
    if (!userId) return

    try {
      const data = await fetchOrders()
      setOrders(data)
    } catch (error) {
      showError(error)
    } finally {
      setLoadingOrders(false)
    }
  }, [userId])

  useEffect(() => {
    setLoadingOrders(true)
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (giftToken && orders.length > 0) {
      const order = orders.find(o => o.gift_token === giftToken)
      if (order) {
        setGiftOrder(order)
      }
    }
  }, [giftToken, orders])

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    if (!confirm(`주문을 취소하시겠습니까?\n\n환불 예정 금액: ${formatPrice(order.total_amount)}원\n환불은 영업일 기준 3-5일이 소요될 수 있습니다.`)) {
      return
    }

    setCancelingOrderId(orderId)
    try {
      await cancelOrder(orderId)
      setOrders(orders.map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              status: 'cancelled',
              refund_status: 'pending',
              refund_amount: order.total_amount,
              refund_requested_at: new Date().toISOString()
            } 
          : o
      ))

      showSuccess('주문이 취소되었습니다.\n환불은 영업일 기준 3-5일이 소요될 수 있습니다.', {
        duration: 5000,
      })
    } catch (error) {
      showError(error)
    } finally {
      setCancelingOrderId(null)
    }
  }, [orders])

  const handleTrackDelivery = useCallback((order: OrderWithItems) => {
    if (!order.tracking_number) {
      showError({ message: '송장번호가 없습니다.' })
      return
    }

    const trackingUrl = `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${order.tracking_number}`
    window.open(trackingUrl, '_blank')
  }, [])

  const handleConfirmPurchase = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const finalAmount = order.total_amount
    const pointsToEarn = Math.floor(Math.max(0, finalAmount) * 0.01)

    const confirmMessage = pointsToEarn > 0
      ? `구매확정하시겠습니까?\n\n구매확정 시 ${pointsToEarn.toLocaleString()}포인트가 적립되며, 이후 교환/반품/환불은 불가합니다.`
      : '구매확정하시겠습니까?\n\n구매확정 시 이후 교환/반품/환불은 불가합니다.'

    if (!confirm(confirmMessage)) {
      return
    }

    setConfirmingOrderId(orderId)
    try {
      const data = await confirmOrder(orderId)

      showSuccess(
        data.pointsEarned > 0
          ? `구매확정이 완료되었습니다.\n${data.pointsEarned.toLocaleString()}포인트가 적립되었습니다.`
          : '구매확정이 완료되었습니다.',
        { duration: 5000 }
      )

      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === orderId 
            ? { ...o, is_confirmed: true }
            : o
        )
      )

      setTimeout(async () => {
        try {
          const refreshed = await fetchOrders()
          setOrders(prevOrders => {
            const serverOrdersMap = new Map<string, OrderWithItems>(
              (refreshed || []).map((o) => [o.id, o])
            )
            return prevOrders.map(order => {
              const serverOrder = serverOrdersMap.get(order.id)
              if (serverOrder) {
                return {
                  ...serverOrder,
                  is_confirmed: order.is_confirmed ?? serverOrder.is_confirmed,
                } as OrderWithItems
              }
              return order
            })
          })
        } catch (err) {
          console.error('주문 목록 새로고침 실패:', err)
        }
      }, 1000)
    } catch (error) {
      showError(error)
    } finally {
      setConfirmingOrderId(null)
    }
  }, [orders])

  const toggleOrderExpand = useCallback((orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }, [])

  return {
    orders,
    loadingOrders,
    cancelingOrderId,
    confirmingOrderId,
    expandedOrders,
    giftOrder,
    toggleOrderExpand,
    handleCancelOrder,
    handleTrackDelivery,
    handleConfirmPurchase,
  }
}


