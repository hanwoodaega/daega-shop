'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'

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
  const addItem = useCartStore((state) => state.addItem)

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
      alert('상품을 찾을 수 없습니다.')
      router.push('/products')
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
  }, [product])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    
    if (product.stock <= 0) {
      alert('품절된 상품입니다.')
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url,
      discount_percent: product.discount_percent ?? undefined,
      brand: product.brand ?? undefined,
      promotion_type: product.promotion_type ?? undefined,
      promotion_products: product.promotion_products ?? undefined,
    })
    
    setShowCartConfirm(true)
  }, [product, quantity, addItem])

  const [promoQuantities, setPromoQuantities] = useState<{[key: string]: number}>({})  

  const handlePromotionAdd = useCallback(() => {
    if (!product) return
    
    const requiredCount = product.promotion_type === '3+1' ? 4 : product.promotion_type === '2+1' ? 3 : 2
    const totalSelected = Object.values(promoQuantities).reduce((sum, qty) => sum + qty, 0)
    
    if (totalSelected !== requiredCount) {
      alert(`${product.promotion_type} 프로모션은 정확히 ${requiredCount}개를 선택해야 합니다.\n현재: ${totalSelected}개`)
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
    const paidCount = product.promotion_type === '3+1' ? 3 : product.promotion_type === '2+1' ? 2 : 1
    let remaining = paidCount
    
    selectedItems.forEach(({ product: p, quantity }) => {
      for (let i = 0; i < quantity; i++) {
        const isFree = remaining <= 0
        addItem({
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity: 1,
          imageUrl: p.image_url,
          discount_percent: isFree ? 100 : (p.discount_percent ?? undefined),
          brand: p.brand ?? undefined,
          promotion_type: product.promotion_type ?? undefined,
          promotion_group_id: groupId,
        })
        remaining--
      }
    })

    setShowPromotionModal(false)
    setPromoQuantities({})
    setShowCartConfirm(true)
  }, [product, promotionProducts, promoQuantities, addItem])

  const updatePromoQuantity = (productId: string, change: number) => {
    const requiredCount = product?.promotion_type === '3+1' ? 4 : product?.promotion_type === '2+1' ? 3 : 2
    const currentQty = promoQuantities[productId] || 0
    const newQty = Math.max(0, currentQty + change)
    
    // 총 수량 확인
    const totalOthers = Object.entries(promoQuantities)
      .filter(([id]) => id !== productId)
      .reduce((sum, [, qty]) => sum + qty, 0)
    
    if (totalOthers + newQty > requiredCount) {
      alert(`최대 ${requiredCount}개까지만 선택 가능합니다`)
      return
    }
    
    setPromoQuantities({
      ...promoQuantities,
      [productId]: newQty
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
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
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 상품 이미지 */}
          <div className="bg-gray-200 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
            <span className="text-gray-500 text-base">이미지 준비중</span>
          </div>

          {/* 상품 정보 */}
          <div>
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
                      {formatPrice(Math.round(product.price * (100 - product.discount_percent) / 100))}
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
                    {formatPrice(
                      (product.discount_percent && product.discount_percent > 0
                        ? Math.round(product.price * (100 - product.discount_percent) / 100)
                        : product.price) * quantity
                    )}
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
        
        {/* 장바구니 / 바로구매 버튼 */}
        <div className="px-0 pt-0 pb-8 grid grid-cols-2 gap-0">
          <button
            onClick={() => { setPendingAction('cart'); setShowQty(true) }}
            disabled={product.stock <= 0}
            className="bg-primary-800 text-white py-3 text-base font-semibold hover:bg-primary-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            장바구니
          </button>
          <button
            onClick={() => { setPendingAction('buy'); setShowQty(true) }}
            disabled={product.stock <= 0}
            className="bg-red-600 text-white py-3 text-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            바로구매
          </button>
        </div>
      </div>

      {/* 수량 선택 미니 패널 */}
      {showQty && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowQty(false)}></div>
          <div className="relative w-full max-w-md mx-auto mb-20 bg-white rounded-t-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">수량</span>
              <button onClick={() => setShowQty(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex items-center justify-center space-x-6 mb-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100">-</button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100">+</button>
            </div>
            <div className="text-center text-sm text-gray-600 mb-4">
              총 {formatPrice(
                (product.discount_percent && product.discount_percent > 0
                  ? Math.round(product.price * (100 - product.discount_percent) / 100)
                  : product.price) * quantity
              )}원
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowQty(false)} className="py-3 rounded-lg border">취소</button>
              <button
                onClick={() => {
                  if (pendingAction === 'cart') {
                    handleAddToCart()
                    setShowQty(false)
                    setShowCartConfirm(true)
                  } else if (pendingAction === 'buy') {
                    handleAddToCart()
                    setShowQty(false)
                    if (!user) {
                      setShowLoginPrompt(true)
                    } else {
                      router.push('/checkout')
                    }
                  }
                }}
                className="py-3 rounded-lg bg-primary-800 text-white font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 유도 모달 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLoginPrompt(false)}></div>
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-5">
            <div className="text-base font-medium mb-2">로그인이 필요합니다.</div>
            <div className="text-sm text-gray-600 mb-5">주문을 계속하시려면 로그인해 주세요.</div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowLoginPrompt(false)} className="py-3 rounded-lg border">취소</button>
              <button onClick={() => router.push(`/auth/login?next=${encodeURIComponent('/checkout')}`)} className="py-3 rounded-lg bg-primary-800 text-white font-semibold">로그인</button>
            </div>
          </div>
        </div>
      )}

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
                상품을 <strong>{product.promotion_type === '3+1' ? '4개' : product.promotion_type === '2+1' ? '3개' : '2개'}</strong> 담으면, 1개가 <strong>무료</strong>로 적용됩니다.
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
                  선택: {Object.values(promoQuantities).reduce((sum, qty) => sum + qty, 0)} / {product.promotion_type === '3+1' ? '4' : product.promotion_type === '2+1' ? '3' : '2'}
                </span>
                <span className="text-xs text-gray-600">
                  {Object.values(promoQuantities).reduce((sum, qty) => sum + qty, 0) < (product.promotion_type === '3+1' ? 4 : product.promotion_type === '2+1' ? 3 : 2) && 
                    `${(product.promotion_type === '3+1' ? 4 : product.promotion_type === '2+1' ? 3 : 2) - Object.values(promoQuantities).reduce((sum, qty) => sum + qty, 0)}개 더 선택`}
                </span>
              </div>
              <button
                onClick={handlePromotionAdd}
                disabled={Object.values(promoQuantities).reduce((sum, qty) => sum + qty, 0) !== (product.promotion_type === '3+1' ? 4 : product.promotion_type === '2+1' ? 3 : 2)}
                className="w-full py-3 bg-pink-500 text-white rounded font-bold hover:bg-pink-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                장바구니에 담기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장바구니 이동 확인 모달 */}
      {showCartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCartConfirm(false)}></div>
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-5">
            <div className="text-base font-medium mb-2">장바구니에 추가되었습니다.</div>
            <div className="text-sm text-gray-600 mb-5">장바구니로 바로 가시겠습니까?</div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCartConfirm(false)} className="py-3 rounded-lg border">취소</button>
              <button onClick={() => router.push('/cart')} className="py-3 rounded-lg bg-primary-800 text-white font-semibold">확인</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

