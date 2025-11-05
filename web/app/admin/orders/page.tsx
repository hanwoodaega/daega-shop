'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusColor } from '@/lib/order-utils'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product?: {
    name: string
    image_url: string
  }
}

interface User {
  name: string
  email: string
  phone: string
}

interface Order {
  id: string
  user_id: string
  total_amount: number
  status: string
  delivery_type: string
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note?: string
  delivery_time?: string
  created_at: string
  order_items?: OrderItem[]
  user?: User
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [selectedDeliveryType, selectedDate, selectedStatus])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (selectedDeliveryType !== 'all') {
        params.append('delivery_type', selectedDeliveryType)
      }
      if (selectedDate) {
        params.append('date', selectedDate)
      }
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`)

      if (response.status === 401) {
        // 인증 실패 시 로그인 페이지로 이동
        router.push('/admin/login?next=/admin/orders')
        return
      }

      if (!response.ok) {
        throw new Error('주문 조회 실패')
      }

      const data = await response.json()
      
      if (data.error) {
        console.error('❌ API 에러:', data)
        alert(`주문 조회에 실패했습니다.\n\n${data.details || data.error}`)
        return
      }
      
      setOrders(data)
    } catch (error) {
      console.error('❌ 주문 조회 실패:', error)
      alert(`주문 조회에 실패했습니다.\n\n${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!confirm(`주문 상태를 "${getStatusText(newStatus)}"(으)로 변경하시겠습니까?`)) {
      return
    }

    setUpdatingOrderId(orderId)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, status: newStatus })
      })

      if (response.status === 401) {
        router.push('/admin/login?next=/admin/orders')
        return
      }

      if (!response.ok) {
        throw new Error('상태 변경 실패')
      }

      // 주문 목록 새로고침
      await fetchOrders()
      alert('주문 상태가 변경되었습니다.')
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getAvailableStatuses = (currentStatus: string, deliveryType: string) => {
    // 픽업의 경우
    if (deliveryType === 'pickup') {
      if (currentStatus === 'paid') {
        return ['shipped', 'cancelled'] // 결제완료 → 준비중 or 취소
      } else if (currentStatus === 'shipped') {
        return ['delivered'] // 준비중 → 완료
      }
      return []
    }
    
    // 퀵배달의 경우
    if (deliveryType === 'quick') {
      if (currentStatus === 'paid') {
        return ['shipped', 'cancelled'] // 결제완료 → 배송중 or 취소
      } else if (currentStatus === 'shipped') {
        return ['delivered'] // 배송중 → 배송완료
      }
      return []
    }

    // 택배배달은 자동으로 처리되므로 상태 변경 불가
    return []
  }

  const filteredOrdersByDeliveryType = selectedDeliveryType === 'all' 
    ? orders 
    : orders.filter(order => order.delivery_type === selectedDeliveryType)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 날짜 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주문 날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>

            {/* 배송 유형 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배송 유형
              </label>
              <select
                value={selectedDeliveryType}
                onChange={(e) => setSelectedDeliveryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                <option value="all">전체</option>
                <option value="pickup">매장 픽업</option>
                <option value="quick">퀵배달</option>
                <option value="regular">택배배달</option>
              </select>
            </div>

            {/* 주문 상태 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주문 상태
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                <option value="all">전체</option>
                <option value="pending">결제 대기</option>
                <option value="paid">결제 완료</option>
                <option value="shipped">배송 중 / 준비 중</option>
                <option value="delivered">배송 완료 / 완료</option>
                <option value="cancelled">주문 취소</option>
              </select>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">전체 주문</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">매장 픽업</p>
            <p className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.delivery_type === 'pickup').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">퀵배달</p>
            <p className="text-2xl font-bold text-purple-600">
              {orders.filter(o => o.delivery_type === 'quick').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">택배배달</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.delivery_type === 'regular').length}
            </p>
          </div>
        </div>

        {/* 주문 목록 */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl text-gray-600">주문 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const availableStatuses = getAvailableStatuses(order.status, order.delivery_type)
              
              return (
                <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* 주문 헤더 */}
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-gray-600">
                          주문일시: {new Date(order.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">주문번호: {order.id}</p>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status, order.delivery_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                        {getDeliveryTypeText(order.delivery_type)}
                      </span>
                      {order.delivery_time && (
                        <span className="text-xs text-gray-600">
                          {order.delivery_type === 'pickup' ? '픽업' : '배달'} 시간: {order.delivery_time}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {/* 고객 정보 */}
                    {/* 고객 정보 - 임시로 주석 처리 */}
                    {order.user && (
                      <div className="mb-4 pb-4 border-b">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">고객 정보</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-700">
                            <span className="font-medium">이름:</span> {order.user?.name || order.shipping_name}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">이메일:</span> {order.user?.email || '정보 없음'}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">전화번호:</span> {formatPhoneNumber(order.user?.phone || order.shipping_phone)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 주문 상품 */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="mb-4 pb-4 border-b">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">주문 상품</h3>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {item.product?.name || '상품'} × {item.quantity}
                              </span>
                              <span className="text-gray-900 font-medium">
                                {formatPrice(item.price * item.quantity)}원
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 배송 정보 */}
                    <div className="mb-4 pb-4 border-b">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">배송 정보</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium">수령인:</span> {order.shipping_name}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">연락처:</span> {formatPhoneNumber(order.shipping_phone)}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">주소:</span> {order.shipping_address}
                        </p>
                        {order.delivery_note && (
                          <p className="text-gray-700">
                            <span className="font-medium">요청사항:</span> {order.delivery_note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 결제 금액 */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-base font-semibold text-gray-900">총 결제금액</span>
                      <span className="text-xl font-bold text-primary-900">
                        {formatPrice(order.total_amount)}원
                      </span>
                    </div>

                    {/* 상태 변경 버튼 */}
                    {availableStatuses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">상태 변경</p>
                        <div className="flex gap-2">
                          {availableStatuses.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(order.id, status)}
                              disabled={updatingOrderId === order.id}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                status === 'cancelled'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-primary-800 text-white hover:bg-primary-900'
                              } disabled:opacity-50`}
                            >
                              {updatingOrderId === order.id ? '처리 중...' : getStatusText(status, order.delivery_type)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

