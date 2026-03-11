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
      toast.error('송장번호가 없습니다.')
      return
    }
    const trackingUrl = getTrackingUrl(order.tracking_number, order.tracking_company)
    window.open(trackingUrl, '_blank')
  }

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">배송 정보</h3>
      <div className="space-y-1 text-sm">
        {order.is_gift && order.user && (
          <div className="mb-2 p-2 bg-yellow-50 rounded">
            <p className="text-xs font-semibold text-yellow-800 mb-1">구매자 정보 (선물 보낸 분)</p>
            <p className="text-gray-700">
              <span className="font-medium">이름:</span> {order.user.name}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">전화번호:</span> {formatPhoneNumber(order.user.phone)}
            </p>
          </div>
        )}
        <p className="text-gray-700">
          <span className="font-medium">수령인:</span> {order.shipping_name}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">연락처:</span> {formatPhoneNumber(order.shipping_phone)}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">주소:</span> {order.shipping_address}
        </p>
        {order.delivery_note && (
          <p className="text-gray-700">
            <span className="font-medium">요청사항:</span> {order.delivery_note}
          </p>
        )}
        {(order.status === 'IN_TRANSIT' || order.status === 'shipped') && order.tracking_number && (
          <div className="mt-3">
            <button
              onClick={handleTrackDelivery}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              배송조회 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

