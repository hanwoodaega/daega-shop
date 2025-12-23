'use client'

import { useRouter } from 'next/navigation'
import { OrderWithItems } from '@/lib/order/order-types'
import { formatPrice } from '@/lib/utils/utils'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusTextColor, getRefundStatusText } from '@/lib/order/order-utils'

interface OrderCardProps {
  order: OrderWithItems
  expandedOrders: Set<string>
  cancelingOrderId: string | null
  confirmingOrderId: string | null
  onToggleExpand: (orderId: string) => void
  onCancelOrder: (orderId: string) => void
  onConfirmPurchase: (orderId: string) => void
  onTrackDelivery: (order: OrderWithItems) => void
}

export default function OrderCard({
  order,
  expandedOrders,
  cancelingOrderId,
  confirmingOrderId,
  onToggleExpand,
  onCancelOrder,
  onConfirmPurchase,
  onTrackDelivery,
}: OrderCardProps) {
  const router = useRouter()
  const isExpanded = expandedOrders.has(order.id)

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
            {!isExpanded ? (
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
              onClick={() => onToggleExpand(order.id)}
              className="w-full py-2 text-sm text-primary-800 font-medium hover:bg-gray-50 rounded transition"
            >
              {isExpanded ? '접기 ▲' : '자세히 보기 ▼'}
            </button>
          </div>
        )}

        {/* 주문 정보 - 펼쳤을 때만 표시 */}
        {isExpanded && (
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
            {/* 선물 주문인 경우 배송 정보 대신 상태 메시지 표시 */}
            {order.gift_token ? (
              <div className="text-sm pt-2">
                <span className="text-gray-900 font-medium">
                  {order.status === 'DELIVERED'
                    ? '선물이 전달되었습니다.' 
                    : '선물 받은 분에게 선물을 전달 중입니다.'}
                </span>
              </div>
            ) : (
              <>
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
              </>
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
            {/* 배송조회 버튼 - 송장번호가 있고 배송 중이거나 배송 완료일 때만 표시 */}
            {order.tracking_number && (
              (order.status === 'IN_TRANSIT' ||
               order.status === 'DELIVERED') && (
                <button
                  onClick={() => onTrackDelivery(order)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  배송조회
                </button>
              )
            )}
            
            {/* 구매확정 버튼 - 배송완료 상태이고 아직 구매확정하지 않은 경우만 표시 */}
            {order.status === 'DELIVERED' && !order.is_confirmed && (
              <button
                onClick={() => onConfirmPurchase(order.id)}
                disabled={confirmingOrderId === order.id}
                className="flex-1 bg-white text-red-600 border border-red-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
              >
                {confirmingOrderId === order.id ? '처리 중...' : '구매확정'}
              </button>
            )}
            
            {/* 구매확정 완료 후: 리뷰 작성 유도 버튼 */}
            {order.status === 'DELIVERED' && order.is_confirmed && (
              <button
                onClick={() => router.push('/profile/reviews')}
                className="flex-1 bg-white border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
              >
                리뷰 작성하기
              </button>
            )}
            
            {/* 주문취소 버튼 - 주문완료 상태일 때만 표시 */}
            {order.status === 'ORDER_RECEIVED' && (
              <button
                onClick={() => onCancelOrder(order.id)}
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
  )
}

