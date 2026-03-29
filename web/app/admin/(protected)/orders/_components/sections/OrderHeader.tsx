import { Order } from '../../_types'
import { getStatusText, getStatusColor, getDeliveryTypeText } from '@/lib/order/order-utils'

interface OrderHeaderProps {
  order: Order
}

export default function OrderHeader({ order }: OrderHeaderProps) {
  const orderDate = new Date(order.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const orderNumber = order.order_number || order.id.slice(0, 8) + '…'
  const statusText = getStatusText(order.status, order.delivery_type)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
        <p className="text-gray-700">
          <span className="text-gray-500">주문일시</span>
          <span className="ml-2 font-medium text-gray-900">{orderDate}</span>
        </p>
        <p className="text-gray-700">
          <span className="text-gray-500">주문번호</span>
          <span className="ml-2 font-mono font-semibold text-gray-900">{orderNumber}</span>
        </p>
        <p className="text-gray-700 flex items-center gap-2">
          <span className="text-gray-500">주문상태</span>
          <span className={`inline-flex px-2.5 py-1 text-sm font-medium rounded-md ${getStatusColor(order.status)}`}>
            {statusText}
          </span>
          {order.delivery_time && (
            <span className="text-sm text-gray-600">
              ({getDeliveryTypeText(order.delivery_type)} {order.delivery_time})
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

