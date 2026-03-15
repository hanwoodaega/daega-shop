'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProductDescription } from '@/components/product-descriptions'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import LoginPromptModal from '@/components/common/LoginPromptModal'
import ConfirmModal from '@/components/common/ConfirmModal'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import PromotionModalWrapper from '@/components/common/PromotionModalWrapper'
import { useAuth } from '@/lib/auth/auth-context'
import { useCartStore, useDirectPurchaseStore, useWishlistStore, usePromotionModalStore } from '@/lib/store'
import { toggleWishlistDB } from '@/lib/wishlist/wishlist-db'
import { addCartItemWithDB } from '@/lib/cart/cart-db'
import { CartItem } from '@/lib/store'
import toast from 'react-hot-toast'
import { showCartAddedToast } from '@/lib/utils/error-handler'
import { Product } from '@/lib/supabase/supabase'
import { isSoldOut } from '@/lib/product/product-utils'
import { getFinalPricing } from '@/lib/product/product.pricing'
import { formatWeightGram, formatPrice } from '@/lib/utils/utils'
import { useProductDetail } from './_hooks/useProductDetail'
import { useProductReviews } from './_hooks/useProductReviews'
import { useProductImages } from './_hooks/useProductImages'
import {
  ProductHeader,
  ProductImageGallery,
  ProductPrice,
  ProductInfo,
  ProductBottomBar,
  ProductQuantitySheet,
  ProductDescription,
  ProductReviewSection,
  ProductInfoButtons,
} from './_components'

interface ProductDetailPageClientProps {
  productId: string
  initialProduct?: Product | null
  initialImages?: Array<{ id: string; image_url: string; priority: number }>
  initialDescriptionImages?: Array<{ id: string; image_url: string; sort_order: number }>
}

export default function ProductDetailPageClient({
  productId,
  initialProduct,
  initialImages,
  initialDescriptionImages,
}: ProductDetailPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  // Hooks
  const { product, loading } = useProductDetail(productId, initialProduct)
  const { reviewCount, averageRating } = useProductReviews(product?.id || null)
  const { images, selectedIndex, handlePrevious, handleNext, handleSwipe } = useProductImages(
    product,
    initialImages
  )
  
  // State
  const [quantity, setQuantity] = useState(1)
  const [showQty, setShowQty] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | 'cart' | 'buy'>(null)
  const [showCartConfirm, setShowCartConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState<string>('')
  const [ProductDescriptionComponent, setProductDescriptionComponent] = useState<React.ComponentType<{ productId: string; productName?: string }> | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Store selectors
  const cartCount = useCartStore((state) => state.getTotalItems())
  const setDirectPurchaseItems = useDirectPurchaseStore((state) => state.setItems)
  const isWished = useWishlistStore((state) => product?.id ? state.items.includes(product.id) : false)
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)
  
  // Hydration 에러 방지
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // 상품 설명 컴포넌트 로드
  useEffect(() => {
    if (product) {
      const slugOrName = product.slug || product.name
      getProductDescription(slugOrName, product.id).then((Component) => {
        setProductDescriptionComponent(() => Component)
      })
    }
  }, [product?.slug, product?.name, product?.id])
  
  // URL 쿼리 파라미터로 프로모션 모달 자동 열기
  useEffect(() => {
    const openPromotion = searchParams?.get('openPromotion')
    if (openPromotion === 'true' && product?.promotion?.is_active && product?.promotion?.type === 'bogo' && product?.id) {
      openPromotionModal(product.id)
      const url = new URL(window.location.href)
      url.searchParams.delete('openPromotion')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, product?.promotion?.type, product?.id, openPromotionModal])
  
  // 품절 여부 확인
  const soldOut = product ? isSoldOut(product.status) : false

  const pricing = product
    ? getFinalPricing({
        basePrice: product.price,
        promotion: product.promotion,
      })
    : null
  
  // 최종 가격 계산
  const getDiscountPercent = useCallback(() => {
    if (!product) return 0
    const pricing = getFinalPricing({
      basePrice: product.price,
      promotion: product.promotion,
    })
    return pricing.discountPercent
  }, [product])
  
  // 장바구니 추가
  const handleAddToCart = useCallback(() => {
    if (!product) return
    
    if (soldOut) {
      toast.error('품절된 상품입니다.', { duration: 3000 })
      return
    }
    
    const finalDiscountPercent = getDiscountPercent()
    
    const cartItem: CartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url || null,
      discount_percent: finalDiscountPercent > 0 ? finalDiscountPercent : undefined,
      brand: product.brand ?? undefined,
    }
    
    addCartItemWithDB(user?.id || null, cartItem)
    showCartAddedToast()
  }, [product, quantity, user, soldOut, getDiscountPercent])
  
  // 찜하기 토글
  const handleWishlistToggle = useCallback(async () => {
    if (!product?.id) return
    
    const success = await toggleWishlistDB(user?.id || null, product.id)
    
    if (success) {
      if (isWished) {
        toast.success('찜 목록에서 제거되었습니다', { id: 'toast-wishlist-removed', duration: 2000 })
      } else {
        toast.success('찜 목록에 추가되었습니다!', { id: 'toast-wishlist-added', duration: 2000 })
      }
    } else {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.', { duration: 3000 })
    }
  }, [product?.id, isWished, user])
  
  // 바로구매
  const handleDirectPurchase = useCallback(() => {
    if (!product) return
    
    const finalDiscountPercent = getDiscountPercent()
    
    setDirectPurchaseItems([{
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url,
      discount_percent: finalDiscountPercent > 0 ? finalDiscountPercent : undefined,
      brand: product.brand ?? undefined,
    }])
    
    if (!user) {
      setShowLoginPrompt(true)
    } else {
      router.push('/checkout')
    }
  }, [product, quantity, user, getDiscountPercent, setDirectPurchaseItems, router])
  
  // 수량 선택 패널 열기
  const handleOpenQuantitySheet = (action: 'cart' | 'buy') => {
    setPendingAction(action)
    setShowQty(true)
  }
  
  // 수량 선택 확인
  const handleQuantityConfirm = () => {
    if (pendingAction === 'cart') {
      handleAddToCart()
      setShowQty(false)
    } else if (pendingAction === 'buy') {
      handleDirectPurchase()
      setShowQty(false)
    }
  }
  
  // 리뷰 섹션으로 스크롤
  const handleReviewClick = () => {
    const reviewSection = document.getElementById('review-section')
    reviewSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="lg:hidden">
          <ProductHeader product={null} cartCount={0} mounted={mounted} />
        </div>
        <div className="hidden lg:block">
          <Header />
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
      </div>
    )
  }
  
  if (!product) {
    return null
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* 모바일: 상품 상세용 간단 헤더 */}
      <div className="lg:hidden">
        <ProductHeader product={product} cartCount={cartCount} mounted={mounted} />
      </div>
      {/* PC: 공통 헤더 + 메인 메뉴 */}
      <div className="hidden lg:block">
        <Header />
      </div>

      <main className="flex-1">
        {/* PC: 이미지 왼쪽 상단, 작은 크기 / 모바일: 기존 전체 너비 */}
        <div className="lg:flex lg:items-start lg:gap-8 lg:max-w-5xl lg:mx-auto lg:px-4 lg:pt-6">
          <div className="w-full aspect-square lg:w-[480px] lg:h-[480px] lg:flex-shrink-0 lg:rounded-lg lg:overflow-hidden">
            <ProductImageGallery
              product={product}
              images={images}
              selectedIndex={selectedIndex}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSwipe={handleSwipe}
            />
          </div>
          <div className="lg:flex-1 lg:min-w-0">
            <div className="px-4 py-8 lg:pt-0 lg:px-0">
              <ProductInfo
                product={product}
                reviewCount={reviewCount}
                averageRating={averageRating}
                onReviewClick={handleReviewClick}
              />
              
              <ProductPrice product={product} />

              <p className="text-sm text-gray-600 mb-4">
                <span className="font-medium text-gray-900">배송 기간:</span> 평균 1~2일 (주말 및 공휴일 제외)
                <span className="block mt-1">오후 3시 이전 주문 시 당일 발송됩니다.</span>
              </p>

              {/* PC: 교환/반품/환불 안내 + 구매 버튼을 상품 텍스트 밑에 배치 */}
              <div className="hidden lg:block">
                <ProductInfoButtons product={product} />
                
                {/* PC: 상품 카드형 수량 선택 (버튼 위 고정) */}
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                  {/* 상품명 + 중량 (동일 스타일) */}
                  <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                    {product.weight_gram && product.weight_gram > 0 && (
                      <span className="ml-1 font-semibold text-gray-900">
                        {' '}
                        {formatWeightGram(product.weight_gram)}
                      </span>
                    )}
                  </h3>

                  <div className="flex items-end justify-between">
                    {/* 가격: 왼쪽 할인가(총액), 오른쪽 정상가(총액) */}
                    {pricing && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(pricing.finalPrice * quantity)}원
                        </span>
                        {pricing.finalPrice !== product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.price * quantity)}원
                          </span>
                        )}
                      </div>
                    )}

                    {/* 수량 조절 */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-full bg-white px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="w-5 h-5 flex items-center justify-center text-base text-gray-700 hover:text-gray-900"
                        >
                          -
                        </button>
                        <span className="mx-3 w-6 text-center text-sm font-medium text-gray-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => prev + 1)}
                          className="w-5 h-5 flex items-center justify-center text-base text-gray-700 hover:text-gray-900"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <ProductBottomBar
                  product={product}
                  productId={productId}
                  isWished={isWished}
                  soldOut={soldOut}
                  onWishlistToggle={handleWishlistToggle}
                  onBuyClick={handleDirectPurchase}
                  onCartClick={handleAddToCart}
                  onPromotionClick={() => openPromotionModal(productId)}
                  staticPosition
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 모바일: 하단 고정 버튼 */}
      <div className="lg:hidden">
        <ProductBottomBar
        product={product}
        productId={productId}
        isWished={isWished}
        soldOut={soldOut}
        onWishlistToggle={handleWishlistToggle}
        onBuyClick={() => handleOpenQuantitySheet('buy')}
        onCartClick={() => handleOpenQuantitySheet('cart')}
        onPromotionClick={() => openPromotionModal(productId)}
      />
      </div>
      
      {showQty && (
        <ProductQuantitySheet
          product={product}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onConfirm={handleQuantityConfirm}
          onCancel={() => setShowQty(false)}
        />
      )}
      
      <LoginPromptModal
        show={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onGuestCheckout={() => router.push('/checkout')}
        loginNextUrl="/checkout"
      />
      
      <PromotionModalWrapper />
      
      <ConfirmModal
        isOpen={showCartConfirm}
        title="장바구니에 추가되었습니다."
        message="장바구니로 바로 가시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={() => router.push('/cart')}
        onCancel={() => setShowCartConfirm(false)}
      />
      
      <div className="lg:hidden">
        <ProductInfoButtons product={product} />
      </div>
      
      <ProductDescription
        product={product}
        descriptionComponent={ProductDescriptionComponent}
        descriptionImages={initialDescriptionImages ?? []}
      />
      
      <ProductReviewSection productId={product.id} />
      
      <ReviewWriteModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false)
          setReviewOrderId('')
        }}
        productId={product.id}
        orderId={reviewOrderId}
        productName={product.name}
        productImage={product.image_url || undefined}
        onSuccess={() => {
          window.location.reload()
        }}
      />
      
      <Footer />
    </div>
  )
}

