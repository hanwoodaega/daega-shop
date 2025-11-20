'use client'

import { memo, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase'
import { useWishlistStore, usePromotionModalStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { toggleWishlistDB } from '@/lib/wishlist-db'
import { addCartItemWithDB } from '@/lib/cart-db'
import { formatPrice } from '@/lib/utils'
import { isValidImageUrl, isOutOfStock, calculateDiscountPrice, isFlashSaleActive } from '@/lib/product-utils'
import StarIcons from '@/components/review/StarIcons'

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const timeoutRef = useRef<number | null>(null)
  // ✅ Zustand selector 패턴 - 필요한 것만 구독
  const isWished = useWishlistStore((state) => state.items.includes(product.id))
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  const { user } = useAuth()
  const userId = user?.id
  
  // ✅ 계산 결과 메모이제이션
  const hasValidImage = useMemo(() => isValidImageUrl(product.image_url), [product.image_url])
  const isPlaceholderHost = useMemo(() => 
    hasValidImage && product.image_url.includes('via.placeholder.com'),
    [hasValidImage, product.image_url]
  )
  const shouldRenderImage = useMemo(() => 
    hasValidImage && !isPlaceholderHost,
    [hasValidImage, isPlaceholderHost]
  )
  const outOfStock = useMemo(() => isOutOfStock(product.stock), [product.stock])
  const discountPrice = useMemo(() => 
    calculateDiscountPrice(product.price, product.discount_percent),
    [product.price, product.discount_percent]
  )

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (outOfStock) {
      toast.error('품절된 상품입니다', {
        icon: '😢',
      })
      return
    }

    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_url,
      discount_percent: product.discount_percent ?? undefined,
      brand: product.brand ?? undefined,
      stock: product.stock,
    }

    // DB 연동 장바구니 추가
    addCartItemWithDB(userId || null, cartItem)

    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
    
    if (product.promotion_type) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        toast('상품 상세페이지에서 프로모션을 확인하세요', {
          icon: '💡',
          duration: 4000,
        })
      }, 500)
    }    
  }, [
    product.id, 
    product.name, 
    product.price, 
    product.image_url, 
    product.discount_percent, 
    product.brand, 
    product.stock,
    product.promotion_type,
    userId, 
    outOfStock
  ])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const handleWishlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 클라이언트에서 직접 DB 접근 (인증 문제 해결)
    const success = await toggleWishlistDB(userId || null, product.id)
    
    if (success) {
      if (isWished) {
        toast.success('찜 목록에서 제거되었습니다', {
          icon: '💔',
        })
      } else {
        toast.success('찜 목록에 추가되었습니다!', {
          icon: '❤️',
        })
      }
    } else {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.', {
        icon: '❌',
      })
    }
  }, [product.id, userId, isWished])

  return (
    <Link href={`/products/${product.slug || product.id}`}>
      <div className="bg-white transition">
        <div className="relative aspect-square bg-gray-200 overflow-hidden rounded-md">
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
        <div className="pt-1 pb-3 px-0">
          {product.brand && (
            <div className="flex items-center justify-between mb-0">
              <div className="text-sm font-bold text-primary-900 line-clamp-1 flex-1 leading-tight tracking-tight">{product.brand}</div>
              <button
                onClick={handleWishlistToggle}
                className="ml-2 p-1 hover:scale-110 transition-transform flex-shrink-0"
                aria-label="찜하기"
              >
                {isWished ? (
                  <svg className="w-6 h-6 text-blue-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                )}
              </button>
            </div>
          )}
          <h3 className="text-sm font-medium mb-0 line-clamp-1 text-primary-900 leading-tight tracking-tight">{product.name}</h3>
          
          {/* 가격 영역을 2줄로 고정하여 카드 높이를 통일 */}
          {product.discount_percent && product.discount_percent > 0 ? (
            <>
              <div className="text-xs text-gray-500 line-through mt-0 leading-tight">
                {formatPrice(product.price)}원
              </div>
              <div className="flex items-baseline gap-2 mt-0 leading-tight">
                <span className="text-base md:text-lg font-bold text-red-600">{product.discount_percent}%</span>
                <span className="text-base font-extrabold text-primary-900">
                  {formatPrice(discountPrice)}<span className="text-xs text-gray-600">원</span>
                </span>
              </div>
            </>
          ) : (
            <>
              {/* 할인 미적용 시에도 1줄을 비워 동일 높이 확보 (줄간격 최소화) */}
              <div className="invisible h-1 leading-none">.</div>
              <div className="flex items-baseline mt-0 leading-tight">
                <span className="text-base font-bold text-primary-900">
                  {formatPrice(product.price)}<span className="text-xs text-gray-600">원</span>
                </span>
              </div>
            </>
          )}
          
          {/* 프로모션 상품 버튼 */}
          {product.promotion_type && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openPromotionModal(product.id)
              }}
              className="mt-2 w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 text-xs font-medium rounded hover:bg-gray-50 transition flex items-center justify-between"
            >
              <span>{product.promotion_type} 상품 골라담기</span>
              <span className="text-gray-600">❯</span>
            </button>
          )}
          
          {/* 리뷰 정보 */}
          {(product.review_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {/* 별 5개 */}
              <StarIcons rating={product.average_rating || 0} size="sm" />
              <span className="text-sm text-black font-medium">
                {product.average_rating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">
                ({product.review_count})
              </span>
            </div>
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

