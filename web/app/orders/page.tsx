'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import OrderItemSkeleton from '@/components/skeletons/OrderItemSkeleton'
import { useAuth } from '@/lib/auth-context'
import { supabase, Order } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusColor, getRefundStatusText } from '@/lib/order-utils'

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
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/orders')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
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
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('주문 조회 실패:', error)
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
      // 주문 취소 및 환불 처리
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          refund_status: 'pending',
          refund_amount: order.total_amount,
          refund_requested_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

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

      toast.success('주문이 취소되었습니다\n환불이 진행됩니다. 영업일 기준 3-5일 소요됩니다.', {
        icon: '✅',
        duration: 5000,
      })
    } catch (error) {
      console.error('주문 취소 실패:', error)
      toast.error('주문 취소에 실패했습니다.')
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
        <Header />
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
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        {/* 헤더 */}
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">주문내역</h1>
        </div>

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
                  <p className="text-sm text-gray-600 mb-2">
                    주문일시: {new Date(order.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status, order.delivery_type)}
                  </span>
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

