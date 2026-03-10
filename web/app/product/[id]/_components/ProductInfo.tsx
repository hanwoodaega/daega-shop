'use client'

import { Product } from '@/lib/supabase/supabase'
import { isSoldOut } from '@/lib/product/product-utils'
import { formatWeightGram } from '@/lib/utils/utils'

interface ProductInfoProps {
  product: Product
  reviewCount: number
  averageRating: number
  onReviewClick: () => void
}

export default function ProductInfo({ product, reviewCount, averageRating, onReviewClick }: ProductInfoProps) {
  const soldOut = isSoldOut(product.status)

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:mt-8 gap-3 mb-2">
      {/* PC: 브랜드 왼쪽, 상품명 오른쪽 / 모바일: 세로 배치 */}
      <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-3 flex-1 min-w-0">
        {product.brand && (
          <div className="text-lg font-bold text-primary-900 mb-1 lg:mb-0">{product.brand}</div>
        )}
        <h1 className="text-xl font-normal inline-flex items-center">
          {product.name}
          {product.weight_gram && product.weight_gram > 0 && (
            <span className="ml-1 text-xl font-normal">
              {formatWeightGram(product.weight_gram)}
            </span>
          )}
        </h1>
      </div>
      {soldOut && (
        <p className="text-sm text-gray-500 mt-1">해당 상품은 품절 되었습니다.</p>
      )}
      
      {/* 리뷰 요약 */}
      {reviewCount > 0 && (
        <button
          onClick={onReviewClick}
          className="flex items-center gap-0 hover:opacity-80 transition flex-shrink-0"
          suppressHydrationWarning
        >
          <div className="flex items-center -space-x-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg 
                key={star}
                className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-orange-500' : 'text-gray-300'}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-base text-blue-600 font-medium">({reviewCount})</span>
        </button>
      )}
    </div>
  )
}

