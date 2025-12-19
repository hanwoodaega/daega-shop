import { Order } from '../../_types'
import { formatPrice } from '@/lib/utils'

interface PaymentSummaryProps {
  order: Order
}

export default function PaymentSummary({ order }: PaymentSummaryProps) {
  const productTotal = order.order_items?.reduce((sum, item) => {
    const originalPrice = (item.product as any)?.price || item.price || 0
    return sum + (originalPrice * item.quantity)
  }, 0) || 0

  return (
    <div className="mb-4 pb-4 border-b">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">결제 상세</h3>
      <div className="mb-3 pb-3 border-b">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">결제방식</span>
          <span className="font-medium text-gray-900">
            {order.payment_method || '카드결제'}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">상품 금액</span>
          <span className="font-medium">{formatPrice(productTotal)}원</span>
        </div>
        
        {(order.immediateDiscount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">즉시할인</span>
            <span className="font-medium text-red-600">-{formatPrice(order.immediateDiscount ?? 0)}원</span>
          </div>
        )}
        
        {(order.couponDiscount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">쿠폰 할인</span>
            <span className="font-medium text-red-600">-{formatPrice(order.couponDiscount ?? 0)}원</span>
          </div>
        )}
        
        {(order.usedPoints ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">포인트 사용</span>
            <span className="font-medium text-red-600">-{formatPrice(order.usedPoints ?? 0)}원</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">배송비</span>
          <span className="font-medium">
            {(order.shipping ?? 0) === 0 ? '무료' : `${formatPrice(order.shipping ?? 0)}원`}
          </span>
        </div>
        
        <div className="flex justify-between pt-2 border-t">
          <span className="text-base font-semibold text-gray-900">총 결제금액</span>
          <span className="text-xl font-bold text-primary-900">
            {formatPrice(order.total_amount)}원
          </span>
        </div>
      </div>
    </div>
  )
}

