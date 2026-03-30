import { Order } from '../_types'

interface OrderStatsProps {
  orders: Order[]
}

export default function OrderStats({ orders }: OrderStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
        <p className="text-sm text-gray-600 mb-1">택배배달</p>
        <p className="text-2xl font-bold text-blue-600">
          {orders.filter(o => o.delivery_type === 'regular' || o.delivery_type === 'quick').length}
        </p>
      </div>
    </div>
  )
}
