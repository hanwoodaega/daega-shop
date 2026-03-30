import { Order } from '../../_types'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import toast from 'react-hot-toast'

function getCarrierCode(name?: string | null): string | undefined {
  const map: Record<string, string> = {
    'CJ대한통운': 'kr.cjlogistics',
    '롯데택배': 'kr.lotte',
    '로젠택배': 'kr.logen',
    '한진택배': 'kr.hanjin',
    '우체국택배': 'kr.epost',
    '경동택배': 'kr.kdexp',
    '합동택배': 'kr.hdexp',
    '대신택배': 'kr.daesin',
    '일양로지스': 'kr.ilyanglogis',
    '천일택배': 'kr.chunilps',
    '건영택배': 'kr.kunyoung',
  }
  return name ? map[name] : undefined
}

function getTrackingUrl(trackingNumber: string, carrierName?: string | null): string {
  const code = getCarrierCode(carrierName || '') || 'kr.lotte'
  return `https://tracker.delivery/#/${code}/${trackingNumber}`
}

interface ShippingInfoProps {
  order: Order
}

export default function ShippingInfo({ order }: ShippingInfoProps) {
  const handleTrackDelivery = () => {
    if (!order.tracking_number) {
      toast.error('송장번호가 없습니다.', { duration: 3000 })
      return
    }
    const trackingUrl = getTrackingUrl(order.tracking_number, order.tracking_company)
    window.open(trackingUrl, '_blank')
  }

  const customerName = order.user?.name ?? order.orderer_name ?? order.recipient_name ?? '-'
  const customerPhone = order.user?.phone ?? order.orderer_phone ?? order.recipient_phone ?? ''
  const ordererName = order.orderer_name || customerName || '-'
  const ordererPhone = order.orderer_phone || customerPhone || ''
  const recipientName = order.recipient_name || '-'
  const recipientPhone = order.recipient_phone || ''

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">배송 정보</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">주문자</p>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">이름</dt>
              <dd className="font-medium text-gray-900">{ordererName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">연락처</dt>
              <dd className="font-medium text-gray-900">{formatPhoneNumber(ordererPhone)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">받는 분</p>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">이름</dt>
              <dd className="font-medium text-gray-900">{recipientName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">연락처</dt>
              <dd className="font-medium text-gray-900">{formatPhoneNumber(recipientPhone)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 lg:col-span-1">
          <p className="text-xs font-semibold text-gray-500 mb-3">배송지</p>
          <p className="text-sm leading-6 text-gray-900 break-words">{order.shipping_address || '-'}</p>
        </div>
      </div>
      {(order.tracking_number || order.tracking_company) && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm text-blue-900">
            <span className="font-medium">택배사</span> {order.tracking_company || '-'}
            <span className="mx-2 text-blue-300">|</span>
            <span className="font-medium">송장번호</span> {order.tracking_number || '-'}
          </div>
          <button
            onClick={handleTrackDelivery}
            disabled={!order.tracking_number}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            배송조회 →
          </button>
        </div>
      )}
    </div>
  )
}

