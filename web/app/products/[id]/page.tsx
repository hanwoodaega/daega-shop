'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LoginPrompt from '@/components/common/LoginPrompt'
import ConfirmModal from '@/components/common/ConfirmModal'
import ReviewList from '@/components/review/ReviewList'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useCartStore, useDirectPurchaseStore, useWishlistStore, usePromotionModalStore } from '@/lib/store'
import { toggleWishlistDB } from '@/lib/wishlist-db'
import { addCartItemWithDB } from '@/lib/cart-db'
import { 
  formatPrice, 
  calculateDiscountedPrice, 
} from '@/lib/utils'
import { saveRecentlyViewed } from '@/lib/recently-viewed'

export default function ProductDetailPage() {
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
  const [showProductInfo, setShowProductInfo] = useState(false)
  const { user } = useAuth()
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const addItem = useCartStore((state) => state.addItem)
  const setDirectPurchaseItems = useDirectPurchaseStore((state) => state.setItems)
  const toggleItem = useWishlistStore((state) => state.toggleItem)
  const isWished = useWishlistStore((state) => state.items.includes(productId))
  const openPromotionModal = usePromotionModalStore((state) => state.openModal)

  const fetchProduct = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품을 찾을 수 없습니다.')
      const t = window.setTimeout(() => router.push('/products'), 1000)
      timeoutsRef.current.push(t)
    } finally {
      setLoading(false)
    }
  }, [productId, router])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // 최근 본 상품 저장
  useEffect(() => {
    if (productId) {
      saveRecentlyViewed(productId)
    }
  }, [productId])

  // product의 average_rating을 설정
  useEffect(() => {
    if (product?.average_rating !== undefined && product.average_rating !== null) {
      setAverageRating(product.average_rating)
    }
  }, [product?.average_rating])

  // 리뷰 개수 가져오기 + 프리페칭
  useEffect(() => {
    const fetchReviewCount = async () => {
      try {
        const response = await fetch(`/api/reviews?productId=${productId}&page=1&limit=3`)
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
      }
    }

    if (productId) {
      fetchReviewCount()
    }
  }, [productId])

  // URL 쿼리 파라미터로 프로모션 모달 자동 열기
  useEffect(() => {
    const openPromotion = searchParams?.get('openPromotion')
    if (openPromotion === 'true' && product?.promotion_type) {
      openPromotionModal(productId)
      // URL에서 쿼리 파라미터 제거 (깔끔하게)
      const url = new URL(window.location.href)
      url.searchParams.delete('openPromotion')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, product?.promotion_type, productId, openPromotionModal])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    
    if (product.stock <= 0) {
      toast.error('품절된 상품입니다', {
        icon: '😢',
      })
      return
    }

    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url,
      discount_percent: product.discount_percent ?? undefined,
      brand: product.brand ?? undefined,
      promotion_type: product.promotion_type ?? undefined,
      promotion_products: product.promotion_products ?? undefined,
      stock: product.stock, // 품절 여부 확인용
    }

    // DB 연동 장바구니 추가
    addCartItemWithDB(user?.id || null, cartItem)
    
    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
  }, [product, quantity, user])


  const handleWishlistToggle = useCallback(async () => {
    // 클라이언트에서 직접 DB 접근 (인증 문제 해결)
    const success = await toggleWishlistDB(user?.id || null, productId)
    
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
  }, [productId, isWished])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header hideMainMenu showCartButton sticky />
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
      <Header hideMainMenu showCartButton sticky />
      
      <main className="flex-1">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* 상품 이미지 - 상하좌우 패딩 제거 */}
          <div className="bg-gray-200 overflow-hidden aspect-square flex items-center justify-center">
            <span className="text-gray-500 text-base">이미지 준비중</span>
          </div>

          {/* 상품 정보 */}
          <div className="px-4 py-8">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-lg font-normal flex-1">{product.name}</h1>
              
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
              {product.discount_percent && product.discount_percent > 0 ? (
                <>
                  <div className="text-sm text-gray-500 line-through mb-2">
                    {formatPrice(product.price)}원
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-red-600">{product.discount_percent}%</span>
                    <span className="text-2xl font-extrabold text-gray-900">
                      {formatPrice(calculateDiscountedPrice(product.price, product.discount_percent))}
                    </span>
                    <span className="text-base text-gray-600">원</span>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-base text-gray-600 ml-2">원</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">상품 정보</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {product.description}
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex">
                  <span className="font-medium w-24">원산지:</span>
                  <span>{product.origin}</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-24">중량:</span>
                  <span>{product.weight} {product.unit}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* 하단 고정 뒤로가기 버튼 (좌측) */}
      <button
        onClick={() => router.back()}
        aria-label="뒤로가기"
        className="fixed bottom-28 left-4 z-50 bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200 shadow-lg rounded-full p-3 hover:bg-white hover:shadow-xl transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        {/* 1+1 골라담기 버튼 (프로모션 상품일 때만 표시) */}
        {product.promotion_type && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => openPromotionModal(productId)}
              className="w-full py-3 bg-pink-100 text-pink-700 text-base font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2"
            >
              <span>🎁</span>
              <span>{product.promotion_type} 골라담기</span>
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
            disabled={product.stock <= 0}
            className="bg-gray-900 text-white py-3 text-base font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ width: '35%' }}
          >
            바로구매
          </button>
          <button
            onClick={() => { setPendingAction('cart'); setShowQty(true) }}
            disabled={product.stock <= 0}
            className="bg-red-600 text-white py-3 text-base font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ width: '50%' }}
          >
            장바구니
          </button>
        </div>
      </div>

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
                  {formatPrice(calculateDiscountedPrice(product.price, product.discount_percent) * quantity)}원
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
                    
                    setDirectPurchaseItems([{
                      productId: product.id,
                      name: product.name,
                      price: product.price,
                      quantity,
                      imageUrl: product.image_url,
                      discount_percent: product.discount_percent ?? undefined,
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
                className="py-2 text-sm rounded-lg bg-primary-800 text-white font-semibold hover:bg-primary-900"
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

      {/* 상품고시정보 모달 */}
      {showProductInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">상품고시정보</h2>
              <button
                onClick={() => setShowProductInfo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 내용 */}
            <div className="p-6">
              {product.product_info ? (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.product_info}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">등록된 상품고시정보가 없습니다.</p>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowProductInfo(false)}
                className="w-full px-4 py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => setShowProductInfo(true)}
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

      {/* 리뷰 섹션 */}
      {product && (
        <div id="review-section" className="container mx-auto px-4 py-2">
          <ReviewList 
            productId={productId} 
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
        productId={productId}
        orderId={reviewOrderId}
        productName={product?.name || ''}
        productImage={product?.image_url}
        onSuccess={() => {
          // 리뷰 목록 새로고침은 ReviewList 컴포넌트에서 자동으로 처리
          window.location.reload()
        }}
      />

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}

