import { Order, OrderStatus } from '../../_types'
import { getStatusText } from '@/lib/order/order-utils'
import toast from 'react-hot-toast'

interface OrderActionsProps {
  order: Order
  updatingOrderId: string | null
  trackingInput: string
  onTrackingChange: (number: string) => void
  carrierInput: string
  onCarrierChange: (carrier: string) => void
  onStatusChange: (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => Promise<boolean>
}

export default function OrderActions({
  order,
  updatingOrderId,
  trackingInput,
  onTrackingChange,
  carrierInput,
  onCarrierChange,
  onStatusChange,
}: OrderActionsProps) {
  const CARRIERS = [
    'CJ대한통운',
    '롯데택배',
    '로젠택배',
    '한진택배',
    '우체국택배',
    '경동택배',
    '합동택배',
    '대신택배',
    '일양로지스',
    '천일택배',
    '건영택배',
  ]
  const getAvailableStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return ['ORDER_RECEIVED', 'cancelled']
      case 'ORDER_RECEIVED':
        return ['PREPARING', 'cancelled']
      case 'PREPARING':
        return ['IN_TRANSIT', 'cancelled']
      case 'IN_TRANSIT':
        return ['DELIVERED', 'cancelled']
      case 'DELIVERED':
        return []
      case 'paid':
        return ['PREPARING', 'cancelled']
      case 'shipped':
        return ['DELIVERED', 'cancelled']
      default:
        return []
    }
  }

  const handleStatusChangeWithConfirm = async (newStatus: OrderStatus, trackingNumber?: string) => {
    if (!window.confirm('주문 상태를 변경하시겠습니까?')) {
      return
    }
    await onStatusChange(order.id, newStatus, trackingNumber)
  }

  const availableStatuses = getAvailableStatuses(order.status)
  const isUpdating = updatingOrderId === order.id

  return (
    <div className="space-y-4">
      {(order.status === 'PREPARING' || order.status === 'ORDER_RECEIVED' || order.status === 'paid') && !order.tracking_number && (
        <div className="pb-4 border-b space-y-2">
          <p className="text-sm font-medium text-gray-700">송장번호</p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">택배사</label>
              <select
                value={carrierInput}
                onChange={(e) => onCarrierChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-800 mb-2"
              >
                {CARRIERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <label className="block text-xs text-gray-600 mb-1">송장번호</label>
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => onTrackingChange(e.target.value)}
                placeholder="송장번호를 입력해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>
            <button
              onClick={() => {
                if (!trackingInput) {
                  toast.error('송장번호를 입력해주세요.')
                  return
                }
                handleStatusChangeWithConfirm('IN_TRANSIT', trackingInput)
              }}
              disabled={isUpdating}
              className="w-full py-2 px-4 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition disabled:opacity-50"
            >
              {isUpdating ? '처리 중...' : '송장번호 입력 및 배송 시작'}
            </button>
          </div>
        </div>
      )}

      {availableStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">상태 변경</p>
          <div className="flex gap-2">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChangeWithConfirm(status as OrderStatus)}
                disabled={isUpdating}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  status === 'cancelled'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary-800 text-white hover:bg-primary-900'
                } disabled:opacity-50`}
              >
                {isUpdating ? '처리 중...' : getStatusText(status as OrderStatus, order.delivery_type as any)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

