'use client'

import { useRouter } from 'next/navigation'
import { Order } from '../_types'
import { formatPrice } from '@/lib/utils/utils'
import { getStatusText, getStatusColor } from '@/lib/order/order-utils'

interface OrderTableProps {
  orders: Order[]
  loading: boolean
}

function orderItemsSummary(order: Order): string {
  if (!order.order_items?.length) return '-'
  return order.order_items
    .map((item) => `${item.product?.name || '상품'} × ${item.quantity}`)
    .join(', ')
}

export default function OrderTable({ orders, loading }: OrderTableProps) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-xl text-gray-600">주문 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문일시</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문 번호</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문상태</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문상품</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">총결제금액</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => router.push(`/admin/orders/${order.id}`)}
              className="cursor-pointer hover:bg-gray-50 transition"
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {new Date(order.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                {order.order_number || order.id.slice(0, 8) + '…'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status, order.delivery_type)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={orderItemsSummary(order)}>
                {orderItemsSummary(order)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                {formatPrice(order.total_amount)}원
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
