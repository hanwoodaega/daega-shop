import { useState, useCallback, useMemo } from 'react'
import { OrderWithItems } from './order-types'
import { cancelOrder, confirmOrder } from './order.service'
import { mutateOrders } from '@/lib/swr/useOrders'
import { useOrdersSWR } from '@/lib/swr'
import { showError, showSuccess } from '@/lib/utils/error-handler'
import { formatPrice } from '@/lib/utils/utils'

interface UseOrdersParams {
  userId?: string | null
  giftToken?: string | null
  /** 기간(개월). 기본 1. 1,3,6,12,36 등 */
  orderPeriodMonths?: number
}

interface UseOrdersReturn {
  orders: OrderWithItems[]
  loadingOrders: boolean
  cancelingOrderId: string | null
  confirmingOrderId: string | null
  expandedOrders: Set<string>
  giftOrder: OrderWithItems | null
  orderPeriodMonths: number
  setOrderPeriodMonths: (months: number) => void
  toggleOrderExpand: (orderId: string) => void
  handleCancelOrder: (orderId: string) => Promise<void>
  handleTrackDelivery: (order: OrderWithItems) => void
  handleConfirmPurchase: (orderId: string) => Promise<void>
}

function getCarrierCode(name?: string | null): string | undefined {
  const map: Record<string, string> = {
    'CJ대한통운': 'kr.cjlogistics',
    '롯데택배': 'kr.lotte',
    '로젠택배': 'kr.logen',
    '한진택배': 'kr.hanjin',
    '우체국택배': 'kr.epost',
    '경동택배': 'kr.kdexp',
    '합동택배': 'kr.hdexp',
    '대신택배': 'kr.daesin',
    '일양로지스': 'kr.ilyanglogis',
    '천일택배': 'kr.chunilps',
    '건영택배': 'kr.kunyoung',
  }
  return name ? map[name] : undefined
}

function getTrackingUrl(trackingNumber: string, carrierName?: string | null): string {
  const code = getCarrierCode(carrierName || '') || 'kr.lotte'
  return `https://tracker.delivery/#/${code}/${trackingNumber}`
}

export function useOrders({ userId, giftToken, orderPeriodMonths: initialMonths = 1 }: UseOrdersParams): UseOrdersReturn {
  const [orderPeriodMonths, setOrderPeriodMonths] = useState(initialMonths)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const { orders, isLoading: loadingOrders, mutate } = useOrdersSWR(orderPeriodMonths)

  const giftOrder = useMemo(() => {
    if (!giftToken || orders.length === 0) return null
    return orders.find((o) => o.gift_token === giftToken) ?? null
  }, [giftToken, orders])

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    if (!confirm(`주문을 취소하시겠습니까?\n\n환불 예정 금액: ${formatPrice(order.total_amount)}원\n환불은 영업일 기준 3-5일이 소요될 수 있습니다.\n\n※ 주문 취소 시 사용한 쿠폰은 복구되지 않습니다.`)) {
      return
    }

    setCancelingOrderId(orderId)
    try {
      await cancelOrder(orderId)
      await mutate(
        { orders: orders.map(o =>
          o.id === orderId
            ? { ...o, status: 'cancelled' as const, refund_completed_at: new Date().toISOString() }
            : o
        )},
        false
      )
      mutate() // revalidate

      showSuccess('주문이 취소되었습니다.\n환불은 영업일 기준 3-5일이 소요될 수 있습니다.', {
        duration: 3000,
      })
    } catch (error) {
      showError(error)
    } finally {
      setCancelingOrderId(null)
    }
  }, [orders, mutate])

  const handleTrackDelivery = useCallback((order: OrderWithItems) => {
    if (!order.tracking_number) {
      showError({ message: '송장번호가 없습니다.' })
      return
    }

    const trackingUrl = getTrackingUrl(order.tracking_number, order.tracking_company)
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
        { duration: 3000 }
      )

      // 서버 기준 상태 재조회 (status=CONFIRMED 반영)
      await mutateOrders()
    } catch (error) {
      showError(error)
    } finally {
      setConfirmingOrderId(null)
    }
  }, [orders, mutate])

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
    orderPeriodMonths,
    setOrderPeriodMonths,
    toggleOrderExpand,
    handleCancelOrder,
    handleTrackDelivery,
    handleConfirmPurchase,
  }
}


