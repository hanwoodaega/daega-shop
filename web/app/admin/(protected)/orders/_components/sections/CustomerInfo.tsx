import { Order } from '../../_types'
import { formatPhoneNumber } from '@/lib/utils/format-phone'

interface CustomerInfoProps {
  order: Order
}

export default function CustomerInfo({ order }: CustomerInfoProps) {
  if (!order.user) return null

  return (
    <div className="pb-4 border-b border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-3">고객 정보</h3>
      <div className="space-y-2 text-base text-gray-700">
        <p><span className="font-medium text-gray-900">이름</span> {order.user?.name || order.orderer_name || order.recipient_name || '-'}</p>
        <p><span className="font-medium text-gray-900">이메일</span> {order.user?.email || '정보 없음'}</p>
        <p><span className="font-medium text-gray-900">전화번호</span> {formatPhoneNumber(order.user?.phone || order.orderer_phone || order.recipient_phone || '')}</p>
      </div>
    </div>
  )
}

