import { Order } from '../../_types'
import { formatPrice } from '@/lib/utils/utils'

interface PaymentSummaryProps {
  order: Order
}

export default function PaymentSummary({ order }: PaymentSummaryProps) {
  const productTotal = order.order_items?.reduce((sum, item) => {
    const originalPrice = (item.product as any)?.price || item.price || 0
    return sum + (originalPrice * item.quantity)
  }, 0) || 0

  const couponDiscount = order.coupon_discount_amount ?? order.couponDiscount ?? 0
  const pointsUsed = order.points_used ?? order.usedPoints ?? 0
  const immediateDiscount = order.immediateDiscount ?? 0
  const shipping = order.shipping ?? 0

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">결제 정보</h3>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">상품금액</span>
          <span className="font-medium text-gray-900">{formatPrice(productTotal)}원</span>
        </div>
        {immediateDiscount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">할인</span>
            <span className="font-medium text-red-600">- {formatPrice(immediateDiscount)}원</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">쿠폰</span>
            <span className="font-medium text-red-600">- {formatPrice(couponDiscount)}원</span>
          </div>
        )}
        {pointsUsed > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">포인트</span>
            <span className="font-medium text-red-600">- {formatPrice(pointsUsed)}원</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">배송비</span>
          <span className="font-medium text-gray-900">
            {shipping === 0 ? '0원' : `+ ${formatPrice(shipping)}원`}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200">
          <span className="text-base font-semibold text-gray-900">총결제금액</span>
          <span className="text-xl font-bold text-primary-900">{formatPrice(order.total_amount)}원</span>
        </div>
      </div>
    </div>
  )
}

