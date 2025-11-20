'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import OrderItemSkeleton from '@/components/skeletons/OrderItemSkeleton'
import { useAuth } from '@/lib/auth-context'
import { supabase, Order } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusColor, getStatusTextColor, getRefundStatusText } from '@/lib/order-utils'
import { showError, showSuccess, handleSupabaseError } from '@/lib/error-handler'
import { useCartStore } from '@/lib/store'

interface OrderWithItems extends Order {
  order_items?: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
    product?: {
      name: string
      image_url: string
    }
  }>
  is_confirmed?: boolean  // 구매확정 여부
}

function OrdersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [giftToken, setGiftToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    if (user?.id) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // user 객체가 아닌 user.id만 의존

  const fetchOrders = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            price,
            product:products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw handleSupabaseError(error)
      
      // 각 주문의 구매확정 여부 확인
      // user_id로 필터링하여 RLS 정책 준수
      const orderIds = (data || []).map((order: OrderWithItems) => order.id)
      
      let confirmedOrderIds = new Set<string>()
      if (orderIds.length > 0 && user?.id) {
        try {
          const { data: pointHistories, error: pointError } = await supabase
            .from('point_history')
            .select('order_id')
            .eq('user_id', user.id)
            .in('order_id', orderIds)
            .eq('type', 'purchase')
          
          if (pointError) {
            console.error('구매확정 여부 조회 실패:', pointError)
          } else if (pointHistories) {
            confirmedOrderIds = new Set(pointHistories.map((ph: any) => ph.order_id))
          }
        } catch (error) {
          console.error('구매확정 여부 조회 실패:', error)
          // 에러가 발생해도 계속 진행
        }
      }
      
      const ordersWithConfirmation = (data || []).map((order: OrderWithItems) => ({
        ...order,
        is_confirmed: confirmedOrderIds.has(order.id)
      }))
      
      setOrders(ordersWithConfirmation)
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
    // 배송 조회 기능 (추후 구현)
    toast(`배송 조회 기능은 준비 중입니다\n\n배송지: ${order.shipping_address}\n수령인: ${order.shipping_name}`, {
      icon: '📦',
      duration: 4000,
    })
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

      // 주문 목록 새로고침
      await fetchOrders()
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
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문내역</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              주문내역
            </h1>
          </div>
          
          {/* 오른쪽: 장바구니 버튼 */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                  cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                }`}
                suppressHydrationWarning
                aria-hidden={cartCount <= 0}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">

        {/* 선물 링크 표시 */}
        {giftToken && (
          <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">선물 링크가 생성되었습니다!</h3>
                <p className="text-sm text-gray-600 mb-3">
                  아래 링크를 카카오톡으로 보내면 받는 분이 주소를 입력할 수 있습니다.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/gift/receive/${giftToken}`}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={async () => {
                      const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
                      try {
                        await navigator.clipboard.writeText(giftLink)
                        setCopied(true)
                        showSuccess('링크가 복사되었습니다!', { icon: '📋' })
                        setTimeout(() => setCopied(false), 2000)
                      } catch (error) {
                        showError({ message: '링크 복사에 실패했습니다.' })
                      }
                    }}
                    className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition text-sm font-medium whitespace-nowrap"
                  >
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
                      const kakaoMessage = `선물을 받아보세요! 🎁\n\n${giftLink}`
                      window.open(`https://talk.kakao.com/msgs?msg=${encodeURIComponent(kakaoMessage)}`, '_blank')
                    }}
                    className="flex-1 px-4 py-2 bg-yellow-300 text-gray-900 rounded-lg hover:bg-yellow-400 transition text-sm font-medium"
                  >
                    카카오톡으로 보내기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주문 목록 */}
        {loadingOrders ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl text-gray-600 mb-6">주문 내역이 없습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
            >
              쇼핑 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 주문 헤더 */}
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <p className="text-sm text-gray-600 mb-1">
                    주문일시: {new Date(order.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {order.order_number && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        주문번호: <span className="font-mono text-primary-900 font-semibold">{order.order_number}</span>
                      </p>
                      <span className={`text-sm font-semibold ${getStatusTextColor(order.status)}`}>
                        {getStatusText(order.status, order.delivery_type)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 주문 상품 목록 */}
                <div className="p-4">
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mb-4">
                      {/* 첫 번째 상품만 표시 */}
                      {!expandedOrders.has(order.id) ? (
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {order.order_items[0].product?.name || '상품'}
                              {order.order_items.length > 1 && (
                                <span className="text-gray-500 ml-1">
                                  외 {order.order_items.length - 1}개 상품
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatPrice(order.order_items[0].price)}원 × {order.order_items[0].quantity}개
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* 모든 상품 표시 */
                        <div className="space-y-3 mb-3">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3">
                              <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {item.product?.name || '상품'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatPrice(item.price)}원 × {item.quantity}개
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 자세히 보기 버튼 */}
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="w-full py-2 text-sm text-primary-800 font-medium hover:bg-gray-50 rounded transition"
                      >
                        {expandedOrders.has(order.id) ? '접기 ▲' : '자세히 보기 ▼'}
                      </button>
                    </div>
                  )}

                  {/* 주문 정보 - 펼쳤을 때만 표시 */}
                  {expandedOrders.has(order.id) && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">배달 유형: </span>
                        <span className="text-gray-900 font-medium">{getDeliveryTypeText(order.delivery_type)}</span>
                      </div>
                      {order.delivery_time && (order.delivery_type === 'pickup' || order.delivery_type === 'quick') && (
                        <div className="text-sm">
                          <span className="text-gray-600">
                            {order.delivery_type === 'pickup' ? '픽업 시간: ' : '배달 시간: '}
                          </span>
                          <span className="text-gray-900 font-medium">{order.delivery_time}</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-gray-600">배송지: </span>
                        <span className="text-gray-900">{order.shipping_address}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">수령인: </span>
                        <span className="text-gray-900">{order.shipping_name}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">연락처: </span>
                        <span className="text-gray-900">{formatPhoneNumber(order.shipping_phone)}</span>
                      </div>
                      {order.delivery_note && (
                        <div className="text-sm">
                          <span className="text-gray-600">요청사항: </span>
                          <span className="text-gray-900">{order.delivery_note}</span>
                        </div>
                      )}
                      
                      {/* 환불 정보 */}
                      {order.refund_status && (
                        <div className="text-sm pt-2 border-t">
                          <span className="text-gray-600">환불 상태: </span>
                          <span className={`font-medium ${
                            order.refund_status === 'completed' ? 'text-green-600' :
                            order.refund_status === 'processing' ? 'text-blue-600' :
                            'text-orange-600'
                          }`}>
                            {getRefundStatusText(order.refund_status)}
                          </span>
                        </div>
                      )}
                      {order.refund_amount && (
                        <div className="text-sm">
                          <span className="text-gray-600">환불 금액: </span>
                          <span className="text-red-600 font-semibold">{formatPrice(order.refund_amount)}원</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 결제 금액 */}
                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-semibold text-gray-900">총 결제금액</span>
                      <span className="text-xl font-bold text-primary-900">
                        {formatPrice(order.total_amount)}원
                      </span>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex gap-2">
                      {/* 배송조회 버튼 - 배송 중이거나 배송 완료일 때만 표시 */}
                      {(order.status === 'shipped' || order.status === 'delivered') && (
                        <button
                          onClick={() => handleTrackDelivery(order)}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        >
                          배송조회
                        </button>
                      )}
                      
                      {/* 구매확정 버튼 - 배송완료 상태이고 아직 구매확정하지 않은 경우만 표시 */}
                      {order.status === 'delivered' && !order.is_confirmed && (
                        <button
                          onClick={() => handleConfirmPurchase(order.id)}
                          disabled={confirmingOrderId === order.id}
                          className="flex-1 bg-white text-blue-900 border border-blue-900 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          {confirmingOrderId === order.id ? '처리 중...' : '구매확정'}
                        </button>
                      )}
                      
                      {/* 구매확정 완료 후: 리뷰 작성 유도 버튼 */}
                      {order.status === 'delivered' && order.is_confirmed && (
                        <button
                          onClick={() => router.push('/profile/reviews')}
                          className="flex-1 bg-white border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                        >
                          리뷰 작성하기
                        </button>
                      )}
                      
                      {/* 주문취소 버튼 - 결제 완료 상태일 때만 표시 */}
                      {order.status === 'paid' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelingOrderId === order.id}
                          className="flex-1 bg-white border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {cancelingOrderId === order.id ? '취소 중...' : '주문취소'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문내역</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  )
}

