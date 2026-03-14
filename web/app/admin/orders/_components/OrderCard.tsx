import { Order, OrderStatus } from '../_types'
import OrderHeader from './sections/OrderHeader'
import OrderItems from './sections/OrderItems'
import ShippingInfo from './sections/ShippingInfo'
import PaymentSummary from './sections/PaymentSummary'
import RefundInfo from './sections/RefundInfo'
import OrderActions from './sections/OrderActions'

interface OrderCardProps {
  order: Order
  updatingOrderId: string | null
  trackingInput: string
  carrierInput: string
  onTrackingChange: (number: string) => void
  onCarrierChange: (carrier: string) => void
  onStatusChange: (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => Promise<boolean>
}

export default function OrderCard({
  order,
  updatingOrderId,
  trackingInput,
  carrierInput,
  onTrackingChange,
  onCarrierChange,
  onStatusChange,
}: OrderCardProps) {
  return (
    <div className="space-y-0">
      <section className="pb-5 border-b border-gray-200">
        <OrderHeader order={order} />
      </section>
      <section className="py-5 border-b border-gray-200">
        <OrderItems order={order} />
      </section>
      <section className="py-5 border-b border-gray-200">
        <ShippingInfo order={order} />
      </section>
      <section className="py-5 border-b border-gray-200">
        <PaymentSummary order={order} />
      </section>
      {order.status === 'cancelled' && (
        <section className="py-5 border-b border-gray-200">
          <RefundInfo order={order} />
        </section>
      )}
      <section className="pt-5">
        <OrderActions
          order={order}
          updatingOrderId={updatingOrderId}
          trackingInput={trackingInput}
          carrierInput={carrierInput}
          onTrackingChange={onTrackingChange}
          onCarrierChange={onCarrierChange}
          onStatusChange={onStatusChange}
        />
      </section>
    </div>
  )
}

