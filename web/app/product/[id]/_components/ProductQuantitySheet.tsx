'use client'

import { Product } from '@/lib/supabase/supabase'
import { formatPrice } from '@/lib/utils/utils'
import { getFinalPricing } from '@/lib/product/product.pricing'

interface ProductQuantitySheetProps {
  product: Product
  quantity: number
  onQuantityChange: (quantity: number) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ProductQuantitySheet({
  product,
  quantity,
  onQuantityChange,
  onConfirm,
  onCancel,
}: ProductQuantitySheetProps) {
  const pricing = getFinalPricing({
    basePrice: product.price,
    promotion: product.promotion,
  })

  const discountedTotal = pricing.finalPrice * quantity
  const originalTotal = product.price * quantity
  let weightLabel: string | null = null
  if (typeof product.weight_gram === 'number' && product.weight_gram > 0) {
    if (product.weight_gram >= 1000) {
      const kg = product.weight_gram / 1000
      // 1000 -> 1kg, 1200 -> 1.2kg
      weightLabel = `${Number.isInteger(kg) ? kg.toString() : kg.toFixed(1)}kg`
    } else {
      weightLabel = `${product.weight_gram}g`
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 pointer-events-auto"
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative w-full max-w-md mx-auto bg-white rounded-t-2xl shadow-2xl p-5 pointer-events-auto border-t border-gray-200">
          {/* 상품 카드 (PC와 비슷한 스타일) */}
          <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-white">
          {/* 상품명 + 중량 (동일 스타일) */}
          <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2">
            {product.name}
            {weightLabel ? ` ${weightLabel}` : ''}
          </h3>

            <div className="flex items-end justify-between">
              {/* 가격: 왼쪽 할인가, 오른쪽 정상가 (수량 반영) */}
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(discountedTotal)}원
                </span>
                {discountedTotal !== originalTotal && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(originalTotal)}원
                  </span>
                )}
              </div>

              {/* 수량 조절 */}
              <div className="flex items-center border border-gray-300 rounded-full bg-gray-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center text-base text-gray-700 active:bg-gray-200 rounded-full"
                >
                  -
                </button>
                <span className="mx-3 min-w-[1.5rem] text-center text-base font-medium text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-base text-gray-700 active:bg-gray-200 rounded-full"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 취소/확인 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="py-3 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="py-3 text-sm font-semibold rounded-lg bg-primary-800 text-white hover:bg-primary-900 active:bg-primary-950"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

