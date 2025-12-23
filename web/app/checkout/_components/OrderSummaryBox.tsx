'use client'

import { formatPrice } from '@/lib/utils/utils'

interface OrderSummaryBoxProps {
  isGiftMode: boolean
  deliveryMethod: 'pickup' | 'quick' | 'regular'
  pickupTime: string
  quickDeliveryArea: string
  quickDeliveryTime: string
  mounted: boolean
  originalTotal: number
  discountAmount: number
  couponDiscount: number
  usedPoints: number
  shipping: number
  finalTotal: number
}

export default function OrderSummaryBox({
  isGiftMode,
  deliveryMethod,
  pickupTime,
  quickDeliveryArea,
  quickDeliveryTime,
  mounted,
  originalTotal,
  discountAmount,
  couponDiscount,
  usedPoints,
  shipping,
  finalTotal,
}: OrderSummaryBoxProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-24 mb-20">
      <h2 className="text-xl font-bold mb-4">주문 요약</h2>
      
      {!isGiftMode && (
        <div className="mb-2 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">배송 방법</span>
            <span className="font-semibold">
              {deliveryMethod === 'pickup' && '픽업'}
              {deliveryMethod === 'quick' && '퀵배송'}
              {deliveryMethod === 'regular' && '택배배송'}
            </span>
          </div>
          {deliveryMethod === 'pickup' && pickupTime && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600">픽업 시간</span>
              <span className="font-semibold">{pickupTime}</span>
            </div>
          )}
          {deliveryMethod === 'quick' && (
            <>
              {quickDeliveryArea && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">배달 지역</span>
                  <span className="font-semibold">{quickDeliveryArea}</span>
                </div>
              )}
              {quickDeliveryTime && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">배달 시간</span>
                  <span className="font-semibold">{quickDeliveryTime}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mounted ? (
        <>
          <div className="border-t pt-4 space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">상품 금액</span>
              <span className="font-semibold">{formatPrice(originalTotal)}원</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">즉시할인</span>
                <span className="font-semibold text-red-600">-{formatPrice(discountAmount)}원</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">쿠폰 할인</span>
                <span className="font-semibold text-red-600">-{formatPrice(couponDiscount)}원</span>
              </div>
            )}
            {usedPoints > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">포인트 사용</span>
                <span className="font-semibold text-red-600">-{formatPrice(usedPoints)}원</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">배송비</span>
              <span className="font-semibold">
                {shipping === 0 ? '무료' : `${formatPrice(shipping)}원`}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>{isGiftMode ? '선물 예상 금액' : '결제 예상 금액'}</span>
                <span className="text-primary-900">{formatPrice(finalTotal + shipping)}원</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t pt-4 mb-6">
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-gray-400">계산 중...</div>
          </div>
        </div>
      )}
    </div>
  )
}

