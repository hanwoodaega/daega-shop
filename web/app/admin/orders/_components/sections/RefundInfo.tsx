import { Order } from '../../_types'
import { getRefundStatusText } from '@/lib/order-utils'
import { formatPrice } from '@/lib/utils'

interface RefundInfoProps {
  order: Order
  updatingOrderId: string | null
  onRefundComplete: (orderId: string) => Promise<boolean>
}

export default function RefundInfo({ order, updatingOrderId, onRefundComplete }: RefundInfoProps) {
  if (order.status !== 'cancelled' || !order.refund_status) return null

  const handleRefundCompleteWithConfirm = async () => {
    if (!window.confirm('Are you sure you want to complete the refund?')) {
      return
    }
    await onRefundComplete(order.id)
  }

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Refund Info</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${
            order.refund_status === 'completed' ? 'text-green-600' :
            'text-yellow-600'
          }`}>
            {getRefundStatusText(order.refund_status)}
          </span>
        </div>
        {order.refund_amount && (
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium text-red-600">
              {formatPrice(order.refund_amount)} won
            </span>
          </div>
        )}
        {order.refund_requested_at && (
          <div className="flex justify-between">
            <span className="text-gray-600">Requested:</span>
            <span className="text-gray-700">
              {new Date(order.refund_requested_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {order.refund_completed_at && (
          <div className="flex justify-between">
            <span className="text-gray-600">Completed:</span>
            <span className="text-gray-700">
              {new Date(order.refund_completed_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {order.refund_status === 'pending' && (
          <button
            onClick={handleRefundCompleteWithConfirm}
            disabled={updatingOrderId === order.id}
            className="w-full mt-2 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            {updatingOrderId === order.id ? 'Updating...' : 'Complete Refund'}
          </button>
        )}
      </div>
    </div>
  )
}

