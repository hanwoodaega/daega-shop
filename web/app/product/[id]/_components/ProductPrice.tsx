'use client'

import { Product } from '@/lib/supabase/supabase'
import { formatPrice } from '@/lib/utils/utils'
import { getFinalPricing } from '@/lib/product/product.pricing'

interface ProductPriceProps {
  product: Product
}

export default function ProductPrice({ product }: ProductPriceProps) {
  const pricing = getFinalPricing({
    basePrice: product.price,
    promotion: product.promotion,
    weightGram: product.weight_gram,
  })

  return (
    <div className="py-2 mb-6">
      {pricing.discountPercent > 0 ? (
        <>
          <div className="text-lg text-gray-500 line-through mb-2">
            {formatPrice(pricing.basePrice)}원
          </div>
          <div className="flex items-baseline mb-2">
            <span className="text-3xl font-bold text-red-600">{pricing.discountPercent}%</span>
            <span className="text-3xl font-extrabold text-gray-900 ml-2">
              {formatPrice(pricing.finalPrice)}
            </span>
            <span className="text-2xl font-bold text-gray-900 ml-1">원</span>
          </div>
          {pricing.pricePer100g && (
            <div className="text-base text-gray-700 font-medium mt-1">
              100g당 {Math.round(pricing.pricePer100g).toLocaleString()}원
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-baseline mb-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {formatPrice(pricing.finalPrice)}
            </span>
            <span className="text-2xl font-bold text-gray-900 ml-1">원</span>
          </div>
          {pricing.pricePer100g && (
            <div className="text-base text-gray-700 font-medium mt-1">
              100g당 {Math.round(pricing.pricePer100g).toLocaleString()}원
            </div>
          )}
        </>
      )}
    </div>
  )
}

