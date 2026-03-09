'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { OrderWithItems } from '@/lib/order/order-types'
import { formatPrice } from '@/lib/utils/utils'
import {
  getStatusText,
  getDeliveryTypeText,
  getStatusTextColor,
  formatOrderDeliveryDisplay,
} from '@/lib/order/order-utils'
import { useCartStore } from '@/lib/store'

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

const PREVIEW_ITEMS = 3

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
  const addToCart = useCartStore((state) => state.addItem)
  const isExpanded = expandedOrders.has(order.id)
  const items = order.order_items || []
  const totalItems = items.length
  const displayItems = isExpanded ? items : items.slice(0, PREVIEW_ITEMS)

  const copyOrderNumber = () => {
    if (order.order_number) {
      navigator.clipboard.writeText(order.order_number)
      toast.success('주문번호가 복사되었습니다.')
    }
  }

  const deliveryTypeLabel = getDeliveryTypeText(order.delivery_type)
  const statusColorClass = getStatusTextColor(order.status)

  const handleAddToCart = (item: NonNullable<OrderWithItems['order_items']>[number]) => {
    addToCart({
      productId: item.product_id,
      name: item.product?.name || '상품',
      price: item.price,
      quantity: 1,
      imageUrl: item.product?.image_url ?? null,
      status: 'active',
    })
    toast.success('장바구니에 담았어요.')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* 헤더: 왼쪽 주문일/번호, 오른쪽 상태 */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900 mb-0.5">
            {new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\. /g, '.').replace(/\.$/, '')}
          </p>
          {order.order_number && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">주문번호 {order.order_number}</span>
              <button
                type="button"
                onClick={copyOrderNumber}
                aria-label="주문번호 복사"
                className="p-0.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className={`text-base font-semibold ${statusColorClass}`}>
            {getStatusText(order.status, order.delivery_type)}
          </span>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="border-t border-gray-100">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="px-5 py-4 flex gap-4 border-b border-gray-100 last:border-b-0"
          >
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
              {item.product?.image_url ? (
                <img
                  src={item.product.image_url}
                  alt={item.product?.name || '상품'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{deliveryTypeLabel}</p>
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                {item.product?.name || '상품'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold text-gray-900">{formatPrice(item.price)}원</span>
                <span className="text-gray-500"> | {item.quantity}개</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAddToCart(item)}
              aria-label="장바구니 담기"
              className="self-center p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        ))}

        {/* 총 N건 주문 펼쳐보기 / 접기 */}
        {totalItems > PREVIEW_ITEMS && (
          <button
            type="button"
            onClick={() => onToggleExpand(order.id)}
            className="w-full py-3 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 transition"
          >
            {isExpanded ? (
              <>접기</>
            ) : (
              <>총 {totalItems}건 주문 펼쳐보기</>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* 하단 버튼: 반품 접수, 후기 작성 / 배송조회, 구매확정 등 */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-wrap">
        {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
          <button
            type="button"
            onClick={() => onTrackDelivery(order)}
            className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            배송조회
          </button>
        )}
        {order.status === 'ORDER_RECEIVED' && (
          <button
            type="button"
            onClick={() => onCancelOrder(order.id)}
            disabled={cancelingOrderId === order.id}
            className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
          >
            {cancelingOrderId === order.id ? '취소 중...' : '주문취소'}
          </button>
        )}
        {order.status === 'DELIVERED' && !order.is_confirmed && (
          <button
            type="button"
            onClick={() => onConfirmPurchase(order.id)}
            disabled={confirmingOrderId === order.id}
            className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-primary-100 text-primary-900 hover:bg-primary-200 transition disabled:opacity-50"
          >
            {confirmingOrderId === order.id ? '처리 중...' : '구매확정'}
          </button>
        )}
        {order.status === 'DELIVERED' && (
          <button
            type="button"
            onClick={() => router.push('/profile/reviews')}
            className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition"
          >
            후기 작성
          </button>
        )}
      </div>
    </div>
  )
}
