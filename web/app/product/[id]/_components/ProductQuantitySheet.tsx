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

  const totalPrice = pricing.finalPrice * quantity

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      <div className="relative w-full max-w-md mx-auto mb-20 bg-white rounded-lg shadow-2xl p-6 pointer-events-auto">
        {/* 상품 카드 */}
        <div className="border-2 border-gray-400 rounded-lg p-4 mb-4 bg-gray-50">
          {/* 상품명 */}
          <h3 className="text-sm font-semibold mb-8 line-clamp-2">{product.name}</h3>
          
          <div className="flex items-end justify-between">
            {/* 수량 조절 */}
            <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
              <button 
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))} 
                className="w-8 h-7 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
              >
                <span className="text-2xl leading-none -mt-1">-</span>
              </button>
              <span className="w-10 text-center text-base font-medium">{quantity}</span>
              <button 
                onClick={() => onQuantityChange(quantity + 1)} 
                className="w-8 h-7 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
              >
                <span className="text-2xl leading-none -mt-1">+</span>
              </button>
            </div>
            
            {/* 가격 */}
            <span className="text-lg font-bold text-primary-900">
              {formatPrice(totalPrice)}원
            </span>
          </div>
        </div>
        
        {/* 취소/확인 버튼 */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onCancel} 
            className="py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="py-2 text-sm rounded-lg bg-primary-800 text-white font-semibold hover:bg-primary-900"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

