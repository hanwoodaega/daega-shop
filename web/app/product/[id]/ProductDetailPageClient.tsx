'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProductDescription } from '@/components/product-descriptions'
import Footer from '@/components/layout/Footer'
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
import { Product } from '@/lib/supabase/supabase'
import { isSoldOut } from '@/lib/product/product-utils'
import { getFinalPricing } from '@/lib/product/product.pricing'
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
}

export default function ProductDetailPageClient({
  productId,
  initialProduct,
  initialImages,
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
      toast.error('품절된 상품입니다.', { icon: '❌' })
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
    toast.success('장바구니에 추가되었습니다!', { icon: '🛒', id: 'toast-cart-added' })
  }, [product, quantity, user, soldOut, getDiscountPercent])
  
  // 찜하기 토글
  const handleWishlistToggle = useCallback(async () => {
    if (!product?.id) return
    
    const success = await toggleWishlistDB(user?.id || null, product.id)
    
    if (success) {
      if (isWished) {
        toast.success('찜 목록에서 제거되었습니다', { icon: '💔', id: 'toast-wishlist-removed' })
      } else {
        toast.success('찜 목록에 추가되었습니다!', { icon: '❤️', id: 'toast-wishlist-added' })
      }
    } else {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.', { icon: '❌' })
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
        <ProductHeader product={null} cartCount={0} mounted={mounted} />
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
      <ProductHeader product={product} cartCount={cartCount} mounted={mounted} />
      
      <main className="flex-1">
        <ProductImageGallery
          product={product}
          images={images}
          selectedIndex={selectedIndex}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSwipe={handleSwipe}
        />
        
        <div className="px-4 py-8">
          <ProductInfo
            product={product}
            reviewCount={reviewCount}
            averageRating={averageRating}
            onReviewClick={handleReviewClick}
          />
          
          <ProductPrice product={product} />
        </div>
      </main>
      
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
      
      <ProductInfoButtons product={product} />
      
      <ProductDescription
        product={product}
        descriptionComponent={ProductDescriptionComponent}
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

