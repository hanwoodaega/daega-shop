'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { getProductDescription } from '@/components/product-descriptions'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Footer from '@/components/Footer'
import LoginPrompt from '@/components/common/LoginPrompt'
import ConfirmModal from '@/components/common/ConfirmModal'
import ReviewList from '@/components/review/ReviewList'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { supabase, Product } from '@/lib/supabase/supabase'
import { useAuth } from '@/lib/auth/auth-context'
import { useCartStore, useDirectPurchaseStore, useWishlistStore, usePromotionModalStore } from '@/lib/store'
import { toggleWishlistDB } from '@/lib/wishlist/wishlist-db'
import { addCartItemWithDB } from '@/lib/cart/cart-db'
import { CartItem } from '@/lib/store'
import { formatPrice } from '@/lib/utils/utils'
import { calculateDiscountPrice, isSoldOut } from '@/lib/product/product-utils'
import { SIMPLE_PRODUCT_SELECT_FIELDS, extractActivePromotion } from '@/lib/product/product-queries'

function ProductDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = params.id as string
  const timeoutsRef = useRef<number[]>([])
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [showQty, setShowQty] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | 'cart' | 'buy'>(null)
  const [showCartConfirm, setShowCartConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState<string>('')
  const [reviewCount, setReviewCount] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [ProductDescriptionComponent, setProductDescriptionComponent] = useState<React.ComponentType<{ productId: string; productName?: string }> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [productImages, setProductImages] = useState<Array<{ id: string; image_url: string; priority: number }>>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const { user } = useAuth()
  
  // 품절 여부 확인
  const soldOut = product ? isSoldOut(product.status) : false
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const addItem = useCartStore((state) => state.addItem)
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  // Hydration 에러 방지
  useEffect(() => {
    setMounted(true)
  }, [])
  const setDirectPurchaseItems = useDirectPurchaseStore((state) => state.setItems)
  const toggleItem = useWishlistStore((state) => state.toggleItem)
  const isWished = useWishlistStore((state) => product?.id ? state.items.includes(product.id) : false)
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true)
      
      // 타임아웃 설정 (5초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      try {
        // API 라우트를 통해 서버 사이드에서 조회
        const response = await fetch(`/api/products/${productId}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '상품을 찾을 수 없습니다.')
        }
        
        const enrichedProduct = await response.json()
        
        // 상품 데이터 먼저 설정 (이미지 없어도 표시)
        setProduct(enrichedProduct)
        setLoading(false)
        
        // 상품 이미지 목록 불러오기 (비동기, 실패해도 무시)
        if (enrichedProduct?.id) {
          supabase
            .from('product_images')
            .select('id, image_url, priority')
            .eq('product_id', enrichedProduct.id)
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .then(({ data: images, error: imagesError }: { data: Array<{ id: string; image_url: string; priority: number }> | null; error: any }) => {
              if (!imagesError && images && images.length > 0) {
                setProductImages(images)
                setProduct((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    image_url: images[0].image_url
                  }
                })
              } else {
                setProductImages([])
              }
            })
            .catch(() => {
              setProductImages([])
            })
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다.')
        }
        throw fetchError
      }
    } catch (error: any) {
      toast.error(error?.message || '상품을 불러오는 데 실패했습니다.')
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchProduct()
  }, [productId])


  // 상품 설명 컴포넌트 로드
  useEffect(() => {
    if (product) {
      // slug가 있으면 slug를 우선 사용, 없으면 이름 사용
      const slugOrName = product.slug || product.name
      getProductDescription(slugOrName, product.id).then((Component) => {
        setProductDescriptionComponent(() => Component)
      })
    }
  }, [product?.slug, product?.name, product?.id])


  // product의 average_rating을 설정
  useEffect(() => {
    if (product?.average_rating !== undefined && product.average_rating !== null) {
      setAverageRating(product.average_rating)
    }
  }, [product?.average_rating])

  // 리뷰 개수 가져오기 + 프리페칭
  const isFetchingReviewCountRef = useRef(false)
  useEffect(() => {
    const fetchReviewCount = async () => {
      // product가 로드되지 않았으면 대기
      if (!product?.id) return
      
      // 중복 호출 방지
      if (isFetchingReviewCountRef.current) return
      
      isFetchingReviewCountRef.current = true
      try {
        const response = await fetch(`/api/reviews?productId=${product.id}&page=1&limit=3`)
        if (response.ok) {
          const data = await response.json()
          setReviewCount(data.total || 0)
          if (typeof data.averageApprovedRating === 'number') {
            setAverageRating(data.averageApprovedRating || 0)
          }
          // 리뷰 데이터를 미리 가져와서 브라우저 캐시에 저장 (프리페칭)
        }
      } catch (error) {
        console.error('리뷰 개수 조회 실패:', error)
      } finally {
        isFetchingReviewCountRef.current = false
      }
    }

    if (product?.id) {
      fetchReviewCount()
    }
  }, [product?.id])

  // URL 쿼리 파라미터로 프로모션 모달 자동 열기
  useEffect(() => {
    const openPromotion = searchParams?.get('openPromotion')
    if (openPromotion === 'true' && product?.promotion?.is_active && product?.promotion?.type === 'bogo' && product?.id) {
      openPromotionModal(product.id)
      // URL에서 쿼리 파라미터 제거 (깔끔하게)
      const url = new URL(window.location.href)
      url.searchParams.delete('openPromotion')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, product?.promotion?.type, product?.id, openPromotionModal])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    
    // 품절 상품은 장바구니에 추가 불가
    if (soldOut) {
      toast.error('품절된 상품입니다.', {
        icon: '❌',
      })
      return
    }
    
    // 타임딜 할인율 (우선순위 높음)
    const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0
    // 활성화된 프로모션 할인율
    const promotionDiscountPercent = (product.promotion?.is_active && product.promotion?.discount_percent) ? product.promotion.discount_percent : 0
    // 최종 할인율 (타임딜 우선)
    const finalDiscountPercent = timedealDiscountPercent > 0 ? timedealDiscountPercent : promotionDiscountPercent

    const cartItem: CartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url || null,
      discount_percent: finalDiscountPercent > 0 ? finalDiscountPercent : undefined,
      brand: product.brand ?? undefined,
    }

    // DB 연동 장바구니 추가
    addCartItemWithDB(user?.id || null, cartItem)
    
    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
  }, [product, quantity, user, soldOut])


  const handleWishlistToggle = useCallback(async () => {
    if (!product?.id) return
    
    // 클라이언트에서 직접 DB 접근 (인증 문제 해결)
    const success = await toggleWishlistDB(user?.id || null, product.id)
    
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
  }, [product?.id, isWished, user])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* 커스텀 헤더 - 뒤로가기 + 상품명 */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition"
              aria-label="뒤로가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 장바구니 버튼 */}
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {mounted && cartCount > 0 && (
                <span
                  className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </header>
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
      {/* 커스텀 헤더 - 뒤로가기 + 상품명 + 장바구니 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg md:text-xl font-semibold line-clamp-1">
              {product.name}
              {product.weight_gram && product.weight_gram > 0 && (
                <span className="ml-1">{product.weight_gram}G</span>
              )}
            </span>
          </button>
          
          {/* 장바구니 버튼 */}
          <button
            onClick={() => router.push('/cart')}
            className="p-2 hover:bg-gray-100 rounded-full transition relative"
            aria-label="장바구니"
          >
            <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                suppressHydrationWarning
                aria-hidden={cartCount <= 0}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>
      
      <main className="flex-1">
        {/* 상품 이미지 - 여러 이미지 표시 */}
        <div className="w-full aspect-square">
          {/* 메인 이미지 - 스와이프 가능 */}
          <div 
            className="w-full h-full bg-gray-200 overflow-hidden relative"
            onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
              onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
              onTouchEnd={() => {
                if (!touchStart || !touchEnd) return
                const distance = touchStart - touchEnd
                const isLeftSwipe = distance > 50
                const isRightSwipe = distance < -50

                if (isLeftSwipe && selectedImageIndex < productImages.length - 1) {
                  setSelectedImageIndex(selectedImageIndex + 1)
                }
                if (isRightSwipe && selectedImageIndex > 0) {
                  setSelectedImageIndex(selectedImageIndex - 1)
                }

                setTouchStart(null)
                setTouchEnd(null)
              }}
            >
              {productImages.length > 0 ? (
                <img
                  src={productImages[selectedImageIndex]?.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-500 text-base">이미지 준비중</span>
                </div>
              )}
              
              {/* 이전 버튼 (여러 이미지가 있을 때만) */}
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      if (selectedImageIndex > 0) {
                        setSelectedImageIndex(selectedImageIndex - 1)
                      }
                    }}
                    disabled={selectedImageIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                    aria-label="이전 이미지"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {/* 다음 버튼 */}
                  <button
                    onClick={() => {
                      if (selectedImageIndex < productImages.length - 1) {
                        setSelectedImageIndex(selectedImageIndex + 1)
                      }
                    }}
                    disabled={selectedImageIndex === productImages.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                    aria-label="다음 이미지"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {/* 이미지 인디케이터 (여러 이미지가 있을 때만 표시) */}
              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                  {selectedImageIndex + 1}/{productImages.length}
                </div>
              )}
            </div>
        </div>

        {/* 상품 정보 */}
        <div className="px-4 py-8">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                {product.brand && (
                  <div className="text-lg font-bold text-primary-900 mb-1">{product.brand}</div>
                )}
                <h1 className="text-xl font-normal inline-flex items-center">
                  {product.name}
                  {product.weight_gram && product.weight_gram > 0 && (
                    <span className="ml-1 text-xl font-normal">{product.weight_gram}G</span>
                  )}
                </h1>
                {soldOut && (
                  <p className="text-sm text-gray-500 mt-1">해당 상품은 품절 되었습니다.</p>
                )}
              </div>
              
              {/* 리뷰 요약 */}
              {reviewCount > 0 && (
                <button
                  onClick={() => {
                    const reviewSection = document.getElementById('review-section')
                    reviewSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
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
            
            <div className="py-2 mb-6">
              {(() => {
                // 타임딜 할인율 (우선순위 높음)
                const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0
                // 프로모션 할인율
                const promotionDiscountPercent = product.promotion?.discount_percent || 0
                // 최종 할인율 (타임딜 우선)
                const finalDiscountPercent = timedealDiscountPercent > 0 ? timedealDiscountPercent : promotionDiscountPercent
                
                // 할인가 계산
                const discountPrice = finalDiscountPercent > 0 
                  ? calculateDiscountPrice(product.price, finalDiscountPercent)
                  : product.price
                
                // 100g당 가격 계산
                const pricePer100g = product.weight_gram && product.weight_gram > 0
                  ? (discountPrice / product.weight_gram) * 100
                  : null
                
                if (finalDiscountPercent > 0) {
                  return (
                    <>
                      <div className="text-lg text-gray-500 line-through mb-2">
                        {formatPrice(product.price)}원
                      </div>
                      <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-bold text-red-600">{finalDiscountPercent}%</span>
                        <span className="text-3xl font-extrabold text-gray-900 ml-2">
                          {formatPrice(discountPrice)}
                        </span>
                        <span className="text-2xl font-bold text-gray-900 ml-1">원</span>
                      </div>
                      {pricePer100g && (
                        <div className="text-base text-gray-700 font-medium mt-1">
                          100g당 {Math.round(pricePer100g).toLocaleString()}원
                        </div>
                      )}
                    </>
                  )
                } else {
                  return (
                    <>
                      <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-extrabold text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-2xl font-bold text-gray-900 ml-1">원</span>
                      </div>
                      {pricePer100g && (
                        <div className="text-base text-gray-700 font-medium mt-1">
                          100g당 {Math.round(pricePer100g).toLocaleString()}원
                        </div>
                      )}
                    </>
                  )
                }
              })()}
            </div>
        </div>
      </main>

      {/* 하단 고정 액션 바 (품절 상품이 아닐 때만 표시) */}
      {!soldOut && (
        <div className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[480px] bg-white border-t border-gray-200 shadow-lg">
              {/* BOGO 골라담기 버튼 (활성화된 프로모션 상품일 때만 표시) */}
              {product.promotion?.is_active && product.promotion?.type === 'bogo' && product.promotion?.buy_qty && (
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => openPromotionModal(productId)}
                    className="w-full py-3 bg-pink-100 text-pink-700 text-base font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2"
                  >
                    <span>🎁</span>
                    <span>{product.promotion.buy_qty}+1 골라담기</span>
                  </button>
                </div>
              )}
              
              {/* 찜 / 바로구매 / 장바구니 버튼 */}
              <div className="px-0 pt-0 pb-0 flex gap-0">
                <button
                  onClick={handleWishlistToggle}
                  className="flex items-center justify-center bg-white py-3 hover:bg-gray-100 transition border border-gray-200"
                  style={{ width: '15%' }}
                  aria-label="찜하기"
                >
                  {isWished ? (
                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => { setPendingAction('buy'); setShowQty(true) }}
                  className="bg-gray-900 text-white py-3 text-base font-semibold hover:bg-gray-800"
                  style={{ width: '35%' }}
                >
                  바로구매
                </button>
                <button
                  onClick={() => { setPendingAction('cart'); setShowQty(true) }}
                  className="bg-red-600 text-white py-3 text-base font-semibold hover:bg-red-600"
                  style={{ width: '50%' }}
                >
                  장바구니
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수량 선택 패널 */}
      {showQty && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
          <div className="relative w-full max-w-md mx-auto mb-20 bg-white rounded-lg shadow-2xl p-6 pointer-events-auto">
            {/* 상품 카드 */}
            <div className="border-2 border-gray-400 rounded-lg p-4 mb-4 bg-gray-50">
              {/* 상품명 */}
              <h3 className="text-sm font-semibold mb-8 line-clamp-2">{product.name}</h3>
              
              <div className="flex items-end justify-between">
                {/* 수량 조절 (왼쪽 아래) - 네모 안에 구분선 */}
                <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-8 h-7 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
                  >
                    <span className="text-2xl leading-none -mt-1">-</span>
                  </button>
                  <span className="w-10 text-center text-base font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="w-8 h-7 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
                  >
                    <span className="text-2xl leading-none -mt-1">+</span>
                  </button>
                </div>
                
                {/* 가격 (오른쪽 아래) */}
                <span className="text-lg font-bold text-primary-900">
                  {(() => {
                    // 타임딜 할인율 (우선순위 높음)
                    const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0
                    // 프로모션 할인율
                    const promotionDiscountPercent = product.promotion?.discount_percent || 0
                    // 최종 할인율 (타임딜 우선)
                    const finalDiscountPercent = timedealDiscountPercent > 0 ? timedealDiscountPercent : promotionDiscountPercent
                    return formatPrice(calculateDiscountPrice(product.price, finalDiscountPercent) * quantity)
                  })()}원
                </span>
              </div>
            </div>
            
            {/* 취소/확인 버튼 */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setShowQty(false)} 
                className="py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (pendingAction === 'cart') {
                    handleAddToCart()
                    setShowQty(false)
                  } else if (pendingAction === 'buy') {
                    // 바로구매: 세션 스토리지에 저장 (장바구니에는 추가하지 않음)
                    if (!product) return
                    
                    // 타임딜 할인율 (우선순위 높음)
                    const timedealDiscountPercent = (product as any).timedeal_discount_percent || 0
                    // 프로모션 할인율
                    const promotionDiscountPercent = product.promotion?.discount_percent || 0
                    // 최종 할인율 (타임딜 우선)
                    const finalDiscountPercent = timedealDiscountPercent > 0 ? timedealDiscountPercent : promotionDiscountPercent

                    setDirectPurchaseItems([{
                      productId: product.id,
                      name: product.name,
                      price: product.price,
                      quantity,
                      imageUrl: product.image_url,
                      discount_percent: finalDiscountPercent > 0 ? finalDiscountPercent : undefined,
                      brand: product.brand ?? undefined,
                    }])
                    
                    setShowQty(false)
                    if (!user) {
                      setShowLoginPrompt(true)
                    } else {
                      router.push('/checkout')
                    }
                  }
                }}
                className="py-2 text-sm rounded-lg bg-primary-800 text-white font-semibold hover:bg-primary-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="주문을 계속하시려면 로그인해 주세요."
      />


      {/* 전역 프로모션 모달 */}
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

      {/* 상품 정보 안내 버튼 */}
      <div className="container mx-auto px-2 py-2">
        <div className="grid grid-cols-2 gap-2">
          {/* 상품고시정보 */}
          <button
            onClick={() => {
              const slugOrId = product?.slug || product?.id
              if (slugOrId) {
                router.push(`/product/${slugOrId}/product-info`)
              }
            }}
            className="bg-white border border-gray-300 py-2 px-2 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <span className="text-sm text-gray-900 font-medium">상품고시정보</span>
            <span className="text-gray-600 text-lg">❯</span>
          </button>

          {/* 교환/반품/환불 안내 */}
          <button
            onClick={() => {
              router.push('/refund')
            }}
            className="bg-white border border-gray-300 py-2 px-2 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <span className="text-sm text-gray-900 font-medium">교환/반품/환불 안내</span>
            <span className="text-gray-600 text-lg">❯</span>
          </button>
        </div>
      </div>

      {/* 상품 설명 섹션 */}
      {product && (
        <div id="product-description-section" className="container mx-auto px-4 py-6">
          {/* 제목 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">상품 설명</h2>
          </div>

          {/* 구분선 */}
          <div className="border-b border-gray-200 mb-4"></div>

          {/* 설명 내용 영역 */}
          {ProductDescriptionComponent ? (
            <ProductDescriptionComponent productId={product.id} productName={product.name} />
          ) : (
            <p className="text-gray-500 text-sm">상품 설명이 준비 중입니다.</p>
          )}
        </div>
      )}

      {/* 리뷰 섹션 */}
      {product && (
        <div id="review-section" className="container mx-auto px-4 py-2">
          <ReviewList 
            productId={product.id} 
            limit={3}
            showViewAllButton={true}
            onWriteReview={() => {
              // ReviewList 내부에서 직접 처리하므로 빈 함수
            }} 
          />
        </div>
      )}

      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false)
          setReviewOrderId('')
        }}
        productId={product?.id || ''}
        orderId={reviewOrderId}
        productName={product?.name || ''}
        productImage={product?.image_url || undefined}
        onSuccess={() => {
          // 리뷰 목록 새로고침은 ReviewList 컴포넌트에서 자동으로 처리
          window.location.reload()
        }}
      />

      <Footer />
    </div>
  )
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        {/* 커스텀 헤더 - 뒤로가기 + 장바구니 */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition"
              aria-label="뒤로가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 장바구니 버튼 */}
            <button
              onClick={() => window.location.href = '/cart'}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
      </div>
    }>
      <ProductDetailPageContent />
    </Suspense>
  )
}

