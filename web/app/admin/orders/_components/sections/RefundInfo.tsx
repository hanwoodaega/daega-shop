import { Order } from '../../_types'
import { formatPrice } from '@/lib/utils/utils'

interface RefundInfoProps {
  order: Order
}

export default function RefundInfo({ order }: RefundInfoProps) {
  if (order.status !== 'cancelled') return null

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">환불 정보</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">금액:</span>
          <span className="font-medium text-red-600">
            {formatPrice(order.total_amount)}원
          </span>
        </div>
        {order.refund_completed_at && (
          <div className="flex justify-between">
            <span className="text-gray-600">취소·환불일:</span>
            <span className="text-gray-700">
              {new Date(order.refund_completed_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

