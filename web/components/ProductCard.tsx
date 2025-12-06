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
import { isValidImageUrl, calculateDiscountPrice, isSoldOut } from '@/lib/product-utils'
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
    hasValidImage && product.image_url?.includes('via.placeholder.com'),
    [hasValidImage, product.image_url]
  )
  const shouldRenderImage = useMemo(() => 
    hasValidImage && !isPlaceholderHost,
    [hasValidImage, isPlaceholderHost]
  )
  // 타임딜 할인율 (우선순위 높음)
  const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0

  // 프로모션 할인가 계산 (타임딜 할인율 우선, 없으면 프로모션 할인율)
  const discountPrice = useMemo(() => {
    // 타임딜 할인율이 있으면 타임딜 할인가 사용
    if (timedealDiscountPercent > 0) {
      return calculateDiscountPrice(product.price, timedealDiscountPercent)
    }
    // 활성화된 percent 타입 프로모션이 있으면 프로모션 할인율 사용
    if (product.promotion?.is_active && product.promotion?.type === 'percent' && product.promotion.discount_percent) {
      return calculateDiscountPrice(product.price, product.promotion.discount_percent)
    }
    return product.price
  }, [product.price, product.promotion, timedealDiscountPercent])

  // 할인율 계산 (타임딜 할인율 우선)
  const discountPercent = useMemo(() => {
    if (timedealDiscountPercent > 0) {
      return timedealDiscountPercent
    }
    if (product.promotion?.is_active && product.promotion?.type === 'percent' && product.promotion.discount_percent) {
      return product.promotion.discount_percent
    }
    return 0
  }, [product.promotion, timedealDiscountPercent])

  // 100g당 가격 계산 (weight_gram 기준)
  const pricePer100g = useMemo(() => {
    if (product.weight_gram && product.weight_gram > 0) {
      return (discountPrice / product.weight_gram) * 100
    }
    return null
  }, [discountPrice, product.weight_gram])

  // 품절 여부 확인
  const soldOut = useMemo(() => isSoldOut(product.status), [product.status])

  // 프로모션 배지 텍스트 (활성화된 프로모션만)
  const promotionBadge = useMemo(() => {
    if (product.promotion?.is_active && product.promotion?.type === 'bogo' && product.promotion.buy_qty) {
      return `${product.promotion.buy_qty}+1`
    }
    return null
  }, [product.promotion])

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 품절 상품은 장바구니에 추가 불가
    if (soldOut) {
      toast.error('품절된 상품입니다.', {
        icon: '❌',
      })
      return
    }
    
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_url,
      discount_percent: discountPercent > 0 ? discountPercent : undefined,
      brand: product.brand ?? undefined,
    }

    // DB 연동 장바구니 추가
    addCartItemWithDB(userId || null, cartItem)

    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
    
    if (product.promotion?.is_active && product.promotion?.type === 'bogo') {
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
    product.brand, 
    product.promotion,
    discountPercent,
    userId,
    soldOut
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
    <Link href={`/product/${product.slug || product.id}`}>
      <div className="bg-white transition">
        <div className="relative aspect-square bg-gray-200 overflow-hidden rounded-md">
          {/* 프로모션 배지 */}
          {promotionBadge && !soldOut && (
            <div className="absolute top-0 left-0 z-10">
              <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold shadow-lg">
                {promotionBadge}
              </span>
            </div>
          )}
          {shouldRenderImage && product.image_url ? (
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
          {/* 품절 오버레이 */}
          {soldOut && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-20">
              <span className="text-white text-3xl font-bold">품절</span>
            </div>
          )}
          {/* 장바구니 버튼 */}
          {!soldOut && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-primary-800 hover:text-white transition z-10"
              aria-label="장바구니에 담기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
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
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
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
          <div className="flex items-center mb-0">
            <h3 className="text-[15px] font-medium line-clamp-1 text-primary-900 leading-tight tracking-tight">{product.name}</h3>
            {product.weight_gram && (
              <span className="text-[15px] font-medium text-primary-900 leading-tight tracking-tight ml-1">
                {product.weight_gram}G
              </span>
            )}
          </div>
          
          {/* 가격 영역을 2줄로 고정하여 카드 높이를 통일 */}
          {discountPercent > 0 ? (
            <>
              <div className="text-xs text-gray-500 line-through mt-0 leading-tight">
                {formatPrice(product.price)}원
              </div>
              <div className="flex items-baseline gap-2 mt-0 leading-tight">
                <span className="text-base md:text-lg font-bold text-red-600">{discountPercent}%</span>
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
          
          {/* 100g당 가격 표시 */}
          {pricePer100g && (
            <p className="text-sm font-medium text-gray-600 mt-0.5 mb-0 leading-tight tracking-tighter">
              (100g당 {Math.round(pricePer100g).toLocaleString()}원)
            </p>
          )}
          
          {/* 프로모션 상품 버튼 (활성화된 BOGO 타입만) */}
          {product.promotion?.is_active && product.promotion?.type === 'bogo' && promotionBadge && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openPromotionModal(product.id)
              }}
              className="mt-2 w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 text-xs font-medium rounded hover:bg-gray-50 transition flex items-center justify-between"
            >
              <span>{promotionBadge} 상품 골라담기</span>
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
    prevProps.product.promotion?.id === nextProps.product.promotion?.id &&
    prevProps.product.promotion?.discount_percent === nextProps.product.promotion?.discount_percent
  )
})

