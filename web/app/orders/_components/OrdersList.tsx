'use client'

import { useRouter } from 'next/navigation'
import { OrderWithItems } from '@/lib/order/order-types'
import OrderCard from './OrderCard'
import OrderSkeleton from './OrderSkeleton'

interface OrdersListProps {
  orders: OrderWithItems[]
  loadingOrders: boolean
  expandedOrders: Set<string>
  cancelingOrderId: string | null
  confirmingOrderId: string | null
  onToggleExpand: (orderId: string) => void
  onCancelOrder: (orderId: string) => void
  onConfirmPurchase: (orderId: string) => void
  onTrackDelivery: (order: OrderWithItems) => void
}

export default function OrdersList({
  orders,
  loadingOrders,
  expandedOrders,
  cancelingOrderId,
  confirmingOrderId,
  onToggleExpand,
  onCancelOrder,
  onConfirmPurchase,
  onTrackDelivery,
}: OrdersListProps) {
  const router = useRouter()

  if (loadingOrders) {
    return <OrderSkeleton />
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-32 md:py-40">
        <p className="text-xl text-gray-600 mb-6">주문 내역이 없습니다.</p>
        <button
          onClick={() => router.push('/products')}
          className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
        >
          쇼핑 시작하기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          expandedOrders={expandedOrders}
          cancelingOrderId={cancelingOrderId}
          confirmingOrderId={confirmingOrderId}
          onToggleExpand={onToggleExpand}
          onCancelOrder={onCancelOrder}
          onConfirmPurchase={onConfirmPurchase}
          onTrackDelivery={onTrackDelivery}
        />
      ))}
    </div>
  )
}

