'use client'

import { memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import { isValidImageUrl, isOutOfStock, calculateDiscountPrice } from '@/lib/product-utils'

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const hasValidImage = isValidImageUrl(product.image_url)
  const isPlaceholderHost = hasValidImage && product.image_url.includes('via.placeholder.com')
  const shouldRenderImage = hasValidImage && !isPlaceholderHost
  const outOfStock = isOutOfStock(product.stock)
  const discountPrice = calculateDiscountPrice(product.price, product.discount_percent)

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (outOfStock) {
      alert('품절된 상품입니다.')
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_url,
      discount_percent: product.discount_percent ?? undefined,
      brand: product.brand ?? undefined,
    })

    const promoMsg = product.promotion_type 
      ? `\n\n💡 상품 상세페이지에서 "${product.promotion_type} 골라담기"를 통해서만 프로모션이 적용됩니다.`
      : ''
    alert(`장바구니에 추가되었습니다.${promoMsg}`)
  }, [product, addItem, outOfStock])

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white transition shadow-sm hover:shadow-md">
        <div className="relative aspect-square bg-gray-200 overflow-hidden">
          {/* 프로모션 배지 */}
          {product.promotion_type && (
            <div className="absolute top-0 left-0 z-10">
              <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                {product.promotion_type}
              </span>
            </div>
          )}
          {shouldRenderImage ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 50vw"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-gray-200">
              이미지 준비중
            </div>
          )}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-xl font-bold">품절</span>
            </div>
          )}
          {/* 장바구니 버튼 */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-primary-800 hover:text-white transition z-10"
            aria-label="장바구니에 담기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
        <div className="pt-2 pb-3 pr-4 pl-2">
          {product.brand && (
            <div className="text-sm font-bold text-primary-900 mb-0.5 line-clamp-1">{product.brand}</div>
          )}
          <h3 className="text-sm font-medium mb-0 line-clamp-1 text-primary-900">{product.name}</h3>
          {/* 가격 영역을 2줄로 고정하여 카드 높이를 통일 */}
          {product.discount_percent && product.discount_percent > 0 ? (
            <>
              <div className="text-xs text-gray-500 line-through mt-1">
                {formatPrice(product.price)}원
              </div>
              <div className="flex items-baseline gap-2 mt-0">
                <span className="text-base md:text-lg font-bold text-red-600">{product.discount_percent}%</span>
                <span className="text-base font-extrabold text-primary-900">
                  {formatPrice(discountPrice)}
                </span>
                <span className="text-gray-600 text-sm">원</span>
              </div>
            </>
          ) : (
            <>
              {/* 할인 미적용 시에도 1줄을 비워 동일 높이 확보 (줄간격 최소화) */}
              <div className="invisible h-2 leading-none">.</div>
              <div className="flex items-baseline gap-1 mt-0">
                <span className="text-base font-bold text-primary-900">
                  {formatPrice(product.price)}
                </span>
                <span className="text-gray-600 text-sm">원</span>
              </div>
            </>
          )}
          
        </div>
      </div>
    </Link>
  )
}

export default memo(ProductCard, (prevProps, nextProps) => {
  // product 객체의 주요 속성이 변경되지 않으면 재렌더링 방지
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.discount_percent === nextProps.product.discount_percent &&
    prevProps.product.promotion_type === nextProps.product.promotion_type
  )
})

