import { Order } from '../../_types'
import { getStatusText, getStatusTextColor, getDeliveryTypeText } from '@/lib/order/order-utils'

interface OrderHeaderProps {
  order: Order
}

export default function OrderHeader({ order }: OrderHeaderProps) {
  return (
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
      <div className="flex items-center justify-between mb-2">
        {order.order_number ? (
          <p className="text-sm text-gray-600">
            주문번호: <span className="font-mono text-primary-900 font-bold text-base">{order.order_number}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-500">ID: {order.id.slice(0, 8)}...</p>
        )}
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${getStatusTextColor(order.status)}`}>
            {getStatusText(order.status, order.delivery_type)}
          </span>
        </div>
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
  )
}

