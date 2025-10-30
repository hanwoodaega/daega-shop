'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useCartStore } from '@/lib/store'

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
  const { user } = useAuth()
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
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
  }

  const handleAddToCart = () => {
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
      unit: product.unit,
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
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
          <div className="bg-gray-200 rounded-lg overflow-hidden aspect-square">
          </div>

          {/* 상품 정보 */}
          <div>
            <h1 className="text-xl font-semibold mb-4">{product.name}</h1>
            
            <div className="border-t border-b py-4 mb-6">
              <div className="flex items-baseline mb-2">
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                <span className="text-base text-gray-600 ml-2">원</span>
                <span className="text-gray-500 ml-2 text-sm">
                  / {product.unit}
                </span>
              </div>
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
                    {formatPrice(product.price * quantity)}
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
        className="fixed bottom-24 left-4 z-50 bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200 shadow-lg rounded-full p-3 hover:bg-white hover:shadow-xl transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 하단 고정 액션 바 (상하 패딩 축소, 하단 여백 확장, 배경 화이트) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
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
            <div className="text-center text-sm text-gray-600 mb-4">총 {formatPrice(product.price * quantity)}원</div>
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

