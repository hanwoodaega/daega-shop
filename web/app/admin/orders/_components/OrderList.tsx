import { Order, OrderStatus } from '../_types'
import OrderCard from './OrderCard'

interface OrderListProps {
  orders: Order[]
  loading: boolean
  updatingOrderId: string | null
  trackingInputs: Record<string, { number: string }>
  setTrackingNumber: (orderId: string, number: string) => void
  onStatusChange: (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => Promise<boolean>
}

export default function OrderList({
  orders,
  loading,
  updatingOrderId,
  trackingInputs,
  setTrackingNumber,
  onStatusChange,
}: OrderListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📦</div>
        <p className="text-xl text-gray-600">주문 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          updatingOrderId={updatingOrderId}
          trackingInput={trackingInputs[order.id]?.number || ''}
          onTrackingChange={(num) => setTrackingNumber(order.id, num)}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}

