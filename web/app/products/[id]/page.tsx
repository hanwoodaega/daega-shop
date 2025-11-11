'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LoginPrompt from '@/components/common/LoginPrompt'
import ConfirmModal from '@/components/common/ConfirmModal'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useCartStore, useDirectPurchaseStore, useWishlistStore } from '@/lib/store'
import { toggleWishlistDB } from '@/lib/wishlist-db'
import { addCartItemWithDB } from '@/lib/cart-db'
import { 
  formatPrice, 
  getPromotionRequiredCount, 
  getPromotionPaidCount, 
  calculateDiscountedPrice, 
  getTotalPromoQuantity 
} from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [showQty, setShowQty] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | 'cart' | 'buy'>(null)
  const [showCartConfirm, setShowCartConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([])
  const { user } = useAuth()
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const addItem = useCartStore((state) => state.addItem)
  const setDirectPurchaseItems = useDirectPurchaseStore((state) => state.setItems)
  const toggleItem = useWishlistStore((state) => state.toggleItem)
  const isWished = useWishlistStore((state) => state.items.includes(productId))

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
      setTimeout(() => router.push('/products'), 1000)
    } finally {
      setLoading(false)
    }
  }, [productId, router])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // 프로모션 교차 상품 가져오기
  useEffect(() => {
    const fetchPromotionProducts = async () => {
      if (!product?.promotion_type || !product?.promotion_products?.length) {
        setPromotionProducts([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('id', product.promotion_products)
        
        if (error) throw error
        setPromotionProducts(data || [])
      } catch (error) {
        console.error('프로모션 상품 조회 실패:', error)
      }
    }

    fetchPromotionProducts()
  }, [product?.id, product?.promotion_type, product?.promotion_products?.join(',')]) // ✅ 필요한 속성만 의존성으로 (무한 루프 방지)

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

  const [promoQuantities, setPromoQuantities] = useState<{[key: string]: number}>({})  

  const handlePromotionAdd = useCallback(() => {
    if (!product) return
    
    const requiredCount = getPromotionRequiredCount(product.promotion_type)
    const totalSelected = getTotalPromoQuantity(promoQuantities)
    
    if (totalSelected !== requiredCount) {
      toast.error(`${product.promotion_type} 프로모션은 정확히 ${requiredCount}개를 선택해야 합니다\n현재: ${totalSelected}개`, {
        icon: '⚠️',
        duration: 4000,
      })
      return
    }

    // 프로모션 그룹 ID 생성
    const groupId = `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 선택한 상품들을 가격 순으로 정렬
    const selectedItems: {product: Product, quantity: number}[] = []
    Object.entries(promoQuantities).forEach(([productId, qty]) => {
      if (qty > 0) {
        const p = promotionProducts.find(p => p.id === productId)
        if (p) {
          selectedItems.push({ product: p, quantity: qty })
        }
      }
    })
    
    // 가격 순 정렬 (높은 가격 → 낮은 가격)
    selectedItems.sort((a, b) => b.product.price - a.product.price)
    
    // 각 상품을 개별로 추가
    const paidCount = getPromotionPaidCount(product.promotion_type)
    let remaining = paidCount
    
    selectedItems.forEach(({ product: p, quantity }) => {
      for (let i = 0; i < quantity; i++) {
        const isFree = remaining <= 0
        const cartItem = {
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity: 1,
          imageUrl: p.image_url,
          discount_percent: isFree ? 100 : (p.discount_percent ?? undefined),
          brand: p.brand ?? undefined,
          promotion_type: product.promotion_type ?? undefined,
          promotion_group_id: groupId,
          stock: p.stock, // 품절 여부 확인용
        }
        // DB 연동 장바구니 추가
        addCartItemWithDB(user?.id || null, cartItem)
        remaining--
      }
    })

    setShowPromotionModal(false)
    setPromoQuantities({})
    
    toast.success('장바구니에 추가되었습니다!', {
      icon: '🛒',
    })
  }, [product, promotionProducts, promoQuantities, user])

  const updatePromoQuantity = (productId: string, change: number) => {
    const requiredCount = getPromotionRequiredCount(product?.promotion_type)
    const currentQty = promoQuantities[productId] || 0
    const newQty = Math.max(0, currentQty + change)
    
    // 총 수량 확인
    const totalOthers = Object.entries(promoQuantities)
      .filter(([id]) => id !== productId)
      .reduce((sum, [, qty]) => sum + qty, 0)
    
    if (totalOthers + newQty > requiredCount) {
      toast.error(`최대 ${requiredCount}개까지만 선택 가능합니다`, {
        icon: '⚠️',
      })
      return
    }
    
    setPromoQuantities({
      ...promoQuantities,
      [productId]: newQty
    })
  }

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
            <h1 className="text-xl font-semibold mb-4">{product.name}</h1>
            
            <div className="border-t border-b py-4 mb-6">
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

            {/* 총 금액 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">총 금액</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-primary-900">
                    {formatPrice(calculateDiscountedPrice(product.price, product.discount_percent) * quantity)}
                  </span>
                  <span className="text-gray-600 ml-1">원</span>
                </div>
              </div>
            </div>
            {/* 기존 버튼 제거: 하단 고정 바 사용 */}
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        {/* 1+1 골라담기 버튼 (프로모션 상품일 때만 표시) */}
        {product.promotion_type && promotionProducts.length > 0 && (
          <div className="border-b border-gray-200">
            <button
              onClick={()=>setShowPromotionModal(true)}
              className="w-full py-3 bg-pink-100 text-pink-700 text-base font-bold hover:bg-pink-200 transition flex items-center justify-center gap-2"
            >
              <span>🎁</span>
              <span>{product.promotion_type} 골라담기</span>
            </button>
          </div>
        )}
        
        {/* 찜 / 바로구매 / 장바구니 버튼 */}
        <div className="px-0 pt-0 pb-8 flex gap-0">
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

      {/* 프로모션 상품 선택 모달 */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={()=>{setShowPromotionModal(false); setPromoQuantities({})}}></div>
          <div className="relative w-full max-w-md bg-white rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">🎁 {product.promotion_type} 골라담기</h3>
                <button onClick={()=>{setShowPromotionModal(false); setPromoQuantities({})}} className="text-pink-700 text-2xl">×</button>
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-700">
                상품을 <strong>{getPromotionRequiredCount(product.promotion_type)}개</strong> 담으면, 1개가 <strong>무료</strong>로 적용됩니다.
              </p>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              
              <div className="space-y-3">
                {promotionProducts.map((promo) => {
                  const qty = promoQuantities[promo.id] || 0
                  return (
                    <div 
                      key={promo.id}
                      className={`border p-4 transition ${
                        qty > 0 ? 'border-black' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* 왼쪽: 이미지 */}
                        <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">이미지 준비중</span>
                        </div>
                        
                        {/* 중앙: 상품명 + 가격 */}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{promo.name}</h4>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(promo.price)}원
                          </p>
                        </div>
                        
                        {/* 오른쪽: 수량 조절 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={()=>updatePromoQuantity(promo.id, -1)}
                            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-sm flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-semibold w-7 text-center text-base">
                            {qty}
                          </span>
                          <button
                            onClick={()=>updatePromoQuantity(promo.id, 1)}
                            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-sm flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="px-5 py-4 bg-white border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  선택: {getTotalPromoQuantity(promoQuantities)} / {getPromotionRequiredCount(product.promotion_type)}
                </span>
                <span className="text-xs text-gray-600">
                  {getTotalPromoQuantity(promoQuantities) < getPromotionRequiredCount(product.promotion_type) && 
                    `${getPromotionRequiredCount(product.promotion_type) - getTotalPromoQuantity(promoQuantities)}개 더 선택`}
                </span>
              </div>
              <button
                onClick={handlePromotionAdd}
                disabled={getTotalPromoQuantity(promoQuantities) !== getPromotionRequiredCount(product.promotion_type)}
                className="w-full py-3 bg-pink-500 text-white rounded font-bold hover:bg-pink-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                장바구니에 담기
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCartConfirm}
        title="장바구니에 추가되었습니다."
        message="장바구니로 바로 가시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={() => router.push('/cart')}
        onCancel={() => setShowCartConfirm(false)}
      />

      <Footer />
    </div>
  )
}

