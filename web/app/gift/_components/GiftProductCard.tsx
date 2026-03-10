'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase/supabase'
import { formatPrice, formatWeightGram } from '@/lib/utils/utils'

/** 선물 페이지 상품 카드에서 사용하는 프로모션 정보 (API 조인 결과, Product와 호환) */
export type GiftProductWithPromotion = Omit<Product, 'promotion'> & {
  promotion?: {
    type?: 'percent' | 'bogo'
    discount_percent?: number
    buy_qty?: number
  } | null
  discount_percent?: number
}

function getGiftProductDisplay(product: GiftProductWithPromotion) {
  const promotionDiscountPercent =
    product.promotion?.type === 'percent' ? (product.promotion.discount_percent ?? 0) : 0
  const discountPercent = promotionDiscountPercent || product.discount_percent || 0
  const finalPrice =
    discountPercent > 0
      ? Math.round(product.price * (1 - discountPercent / 100))
      : product.price
  const pricePer100g =
    product.weight_gram && product.weight_gram > 0
      ? (finalPrice / product.weight_gram) * 100
      : null
  const promotionBadge =
    product.promotion?.type === 'bogo' && product.promotion.buy_qty
      ? `${product.promotion.buy_qty}+1`
      : null
  return { discountPercent, finalPrice, pricePer100g, promotionBadge }
}

interface GiftProductCardProps {
  product: GiftProductWithPromotion
}

export default function GiftProductCard({ product }: GiftProductCardProps) {
  const { discountPercent, finalPrice, pricePer100g, promotionBadge } =
    getGiftProductDisplay(product)

  return (
    <Link href={`/product/${product.id}`}>
      <div className="flex gap-4 hover:opacity-80 transition mb-4">
        <div className="relative w-28 h-28 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
          {promotionBadge && (
            <div className="absolute top-0 left-0 z-10">
              <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                {promotionBadge}
              </span>
            </div>
          )}
          {product.image_url && !product.image_url.includes('via.placeholder.com') ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              이미지
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {product.brand && (
            <div className="text-sm font-semibold text-gray-600 mb-1">{product.brand}</div>
          )}
          <div className="flex items-center mb-2">
            <h3 className="text-base font-medium text-gray-900 line-clamp-2">{product.name}</h3>
            {product.weight_gram && (
              <span className="text-base font-medium text-gray-900 ml-1">
                {formatWeightGram(product.weight_gram)}
              </span>
            )}
          </div>
          {discountPercent > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-red-600">{discountPercent}%</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(finalPrice)}원
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(product.price)}원
                </span>
              </div>
              {pricePer100g != null && (
                <p className="text-xs text-gray-600 mt-0.5">
                  (100g당 {formatPrice(pricePer100g)}원)
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(product.price)}원
              </div>
              {pricePer100g != null && (
                <p className="text-xs text-gray-600 mt-0.5">
                  (100g당 {formatPrice(pricePer100g)}원)
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
