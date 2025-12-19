import { Order } from '../../_types'
import { formatPhoneNumber } from '@/lib/format-phone'

interface CustomerInfoProps {
  order: Order
}

export default function CustomerInfo({ order }: CustomerInfoProps) {
  if (!order.user) return null

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">고객 정보</h3>
      <div className="space-y-1 text-sm">
        <p className="text-gray-700">
          <span className="font-medium">이름:</span> {order.user?.name || order.shipping_name}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">이메일:</span> {order.user?.email || '정보 없음'}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">전화번호:</span> {formatPhoneNumber(order.user?.phone || order.shipping_phone)}
        </p>
      </div>
    </div>
  )
}

