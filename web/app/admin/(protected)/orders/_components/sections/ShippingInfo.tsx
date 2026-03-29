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

  const customerName = order.user?.name ?? order.shipping_name
  const customerPhone = order.user?.phone ?? order.shipping_phone

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">배송 정보</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base text-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">고객 정보</p>
          <p><span className="font-medium text-gray-900">이름</span> {customerName}</p>
          <p><span className="font-medium text-gray-900">연락처</span> {formatPhoneNumber(customerPhone)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">수령인</p>
          <p><span className="font-medium text-gray-900">이름</span> {order.shipping_name}</p>
          <p><span className="font-medium text-gray-900">연락처</span> {formatPhoneNumber(order.shipping_phone)}</p>
          <p><span className="font-medium text-gray-900">주소</span> {order.shipping_address}</p>
        </div>
      </div>
      {order.tracking_number && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleTrackDelivery}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            배송조회 →
          </button>
        </div>
      )}
    </div>
  )
}

