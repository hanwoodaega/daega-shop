'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth/auth-context'
import { OrderWithItems } from '@/lib/order/order-types'
import { formatPrice } from '@/lib/utils/utils'
import { showError, showSuccess } from '@/lib/utils/error-handler'
import { initKakaoSDK } from '@/lib/order/gift/initKakao'
import OrderHeader from './_components/OrderHeader'
import OrderSkeleton from './_components/OrderSkeleton'
import GiftShareBox from './_components/GiftShareBox'
import OrdersList from './_components/OrdersList'

function OrdersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [giftToken, setGiftToken] = useState<string | null>(null)
  const [giftOrder, setGiftOrder] = useState<OrderWithItems | null>(null)

  // 카카오톡 SDK 로드
  useEffect(() => {
    initKakaoSDK()
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/orders')
    }
  }, [user, loading, router])

  useEffect(() => {
    const token = searchParams?.get('giftToken')
    if (token) {
      setGiftToken(token)
    }
  }, [searchParams])

  useEffect(() => {
    // giftToken이 있고 orders가 로드되면 해당 주문 찾기
    if (giftToken && orders.length > 0) {
      const order = orders.find(o => o.gift_token === giftToken)
      if (order) {
        setGiftOrder(order)
      }
    }
  }, [giftToken, orders])

  useEffect(() => {
    if (user?.id) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // user 객체가 아닌 user.id만 의존

  const fetchOrders = async () => {
    if (!user?.id) return
    
    try {
      // 서버 API로 주문 목록 조회 (구매확정 여부 포함)
      const res = await fetch('/api/orders')
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '주문 조회에 실패했습니다.')
      }
      
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (error) {
      showError(error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    if (!confirm(`주문을 취소하시겠습니까?\n\n환불 예정 금액: ${formatPrice(order.total_amount)}원\n환불은 영업일 기준 3-5일 소요됩니다.`)) {
      return
    }

    setCancelingOrderId(orderId)
    try {
      // 주문 취소 API 호출 (포인트 환불 포함)
      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '주문 취소에 실패했습니다.')
      }

      // 주문 목록 업데이트
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

      showSuccess('주문이 취소되었습니다.\n환불이 진행됩니다. 영업일 기준 3-5일 소요됩니다.', {
        duration: 5000,
      })
    } catch (error) {
      showError(error)
    } finally {
      setCancelingOrderId(null)
    }
  }

  const handleTrackDelivery = (order: OrderWithItems) => {
    if (!order.tracking_number) {
      showError({ message: '송장번호가 없습니다.' })
      return
    }

    // 롯데택배 배송조회 링크
    const trackingNumber = order.tracking_number
    const trackingUrl = `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${trackingNumber}`

    // 새 창에서 배송조회 링크 열기
    window.open(trackingUrl, '_blank')
  }

  const handleConfirmPurchase = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    // 적립될 포인트 계산
    // order.total_amount는 이미 최종 결제 금액(상품금액 - 할인 - 쿠폰 - 포인트)입니다.
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
      const response = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '구매확정에 실패했습니다.')
      }

      showSuccess(
        data.pointsEarned > 0
          ? `구매확정이 완료되었습니다.\n${data.pointsEarned.toLocaleString()}포인트가 적립되었습니다.`
          : '구매확정이 완료되었습니다.',
        {
          duration: 5000,
        }
      )

      // 즉시 로컬 상태 업데이트 (구매확정 버튼 제거)
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, is_confirmed: true }
            : order
        )
      )

      // 주문 목록 새로고침 (약간의 지연 후 - point_history가 DB에 반영될 시간을 줌)
      setTimeout(async () => {
        try {
          const res = await fetch('/api/orders')
          if (res.ok) {
            const data = await res.json()
            // 서버 데이터와 로컬 상태 병합 (구매확정 상태는 로컬 상태 우선)
            setOrders(prevOrders => {
              const serverOrdersMap = new Map<string, OrderWithItems>(
                (data.orders || []).map((order: OrderWithItems) => [order.id, order])
              )
              return prevOrders.map(order => {
                const serverOrder = serverOrdersMap.get(order.id)
                if (serverOrder) {
                  // 구매확정한 주문은 로컬 상태의 is_confirmed를 유지
                  return {
                    ...serverOrder,
                    is_confirmed: order.is_confirmed ?? serverOrder.is_confirmed,
                  } as OrderWithItems
                }
                return order
              })
            })
          }
        } catch (err) {
          console.error('주문 목록 새로고침 실패:', err)
          // 실패해도 로컬 상태는 이미 업데이트되었으므로 무시
        }
      }, 1000) // 1초 지연
    } catch (error: any) {
      showError(error)
    } finally {
      setConfirmingOrderId(null)
    }
  }

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <OrderHeader />
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <OrderSkeleton />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <OrderHeader />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        {/* 선물 링크 표시 */}
        {giftToken && (
          <GiftShareBox giftToken={giftToken} giftOrder={giftOrder} />
        )}

        {/* 주문 목록 */}
        <OrdersList
          orders={orders}
          loadingOrders={loadingOrders}
          expandedOrders={expandedOrders}
          cancelingOrderId={cancelingOrderId}
          confirmingOrderId={confirmingOrderId}
          onToggleExpand={toggleOrderExpand}
          onCancelOrder={handleCancelOrder}
          onConfirmPurchase={handleConfirmPurchase}
          onTrackDelivery={handleTrackDelivery}
        />
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50">
        <OrderHeader />
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <OrderSkeleton />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  )
}
