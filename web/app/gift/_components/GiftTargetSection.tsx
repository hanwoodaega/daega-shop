'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase/supabase'
import { GiftTarget } from '@/lib/gift'
import { formatPrice } from '@/lib/utils/utils'

interface GiftTargetSectionProps {
  selectedTarget: GiftTarget | null
  products: Product[]
  loading: boolean
  onTargetChange: (target: GiftTarget | null) => void
}

const TARGETS: GiftTarget[] = ['아이', '부모님', '연인', '친구']

export default function GiftTargetSection({
  selectedTarget,
  products,
  loading,
  onTargetChange,
}: GiftTargetSectionProps) {
  return (
    <section className="container mx-auto px-4 mb-8">
      <h2 className="text-lg font-semibold mb-4">맞춤 선물이 고민된다면</h2>
      <div className="flex gap-2 mb-4">
        {TARGETS.map((target) => (
          <button
            key={target}
            onClick={() => onTargetChange(selectedTarget === target ? null : target)}
            className={`px-4 py-2.5 text-base rounded-lg font-medium transition flex-shrink-0 ${
              selectedTarget === target
                ? 'bg-red-600 text-white hover:bg-red-600'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            {target}
          </button>
        ))}
      </div>
      {selectedTarget && (
        <>
          {loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 mb-4">
                  <div className="w-28 h-28 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div>
              {products.map((product) => {
                const promotionDiscountPercent = (product as any).promotion?.type === 'percent' 
                  ? (product as any).promotion.discount_percent 
                  : 0
                const discountPercent =
                  promotionDiscountPercent || (product as any).discount_percent || 0
                const finalPrice = discountPercent > 0
                  ? Math.round(product.price * (1 - discountPercent / 100))
                  : product.price
                const pricePer100g = product.weight_gram && product.weight_gram > 0
                  ? (finalPrice / product.weight_gram) * 100
                  : null
                const promotionBadge = (product as any).promotion?.type === 'bogo' && (product as any).promotion.buy_qty
                  ? `${(product as any).promotion.buy_qty}+1`
                  : null
                
                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
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
                              {product.weight_gram}G
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
                            {pricePer100g && (
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
                            {pricePer100g && (
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
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{selectedTarget}에게 추천하는 선물세트가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

