import { Order, OrderStatus } from '../_types'
import OrderHeader from './sections/OrderHeader'
import CustomerInfo from './sections/CustomerInfo'
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <OrderHeader order={order} />
      
      <div className="p-4">
        <CustomerInfo order={order} />
        <OrderItems order={order} />
        <ShippingInfo order={order} />
        <PaymentSummary order={order} />
        <RefundInfo order={order} />
        <OrderActions 
          order={order}
          updatingOrderId={updatingOrderId}
          trackingInput={trackingInput}
          carrierInput={carrierInput}
          onTrackingChange={onTrackingChange}
          onCarrierChange={onCarrierChange}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  )
}

