'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
// Navbar 제거: 장바구니 전용 헤더 사용
import Footer from '@/components/Footer'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore()
  const { user } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false as any)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('장바구니가 비어있습니다.')
      return
    }
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    router.push('/checkout')
  }

  const handleGiftCheckout = () => {
    if (items.length === 0) {
      alert('장바구니가 비어있습니다.')
      return
    }
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    router.push('/checkout?mode=gift')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 장바구니 전용 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 -ml-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">장바구니</h1>
          <button
            onClick={() => router.push('/')}
            aria-label="홈으로"
            className="p-2 -mr-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-2 py-8">

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-xl text-gray-600 mb-6">장바구니가 비어있습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="bg-white rounded-lg shadow-md pr-6 pl-3 py-6 border border-gray-300">
                  <div className="flex items-start space-x-4">
                    {/* 상품 이미지 (각진 모서리, 크기 약간 축소) */}
                    <div className="w-20 h-20 bg-gray-200 flex-shrink-0"></div>

                    {/* 상품 정보 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-normal mb-1 pr-2 line-clamp-2">{item.name}</h3>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 hover:text-red-700 text-xs flex-shrink-0"
                        >
                          삭제
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}원
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                          >
                            -
                          </button>
                          <span className="font-semibold w-6 text-center text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))}

              
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">주문 요약</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 금액</span>
                    <span className="font-semibold">{formatPrice(getTotalPrice())}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span className="font-semibold">
                      {getTotalPrice() >= 50000 ? '무료' : '3,000원'}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-primary-900">
                        {formatPrice(getTotalPrice() + (getTotalPrice() >= 50000 ? 0 : 3000))}원
                      </span>
                    </div>
                  </div>
                </div>

                {getTotalPrice() < 50000 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                    {formatPrice(50000 - getTotalPrice())}원 더 담으면 무료배송!
                  </div>
                )}

                <button
                  onClick={() => router.push('/products')}
                  className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  쇼핑 계속하기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 고정 액션 바: 선물하기 / 주문하기 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="px-0 pt-0 pb-8 grid grid-cols-2 gap-0">
          <button
            onClick={handleGiftCheckout}
            className="bg-gray-900 text-white py-3 text-lg font-semibold hover:bg-gray-800"
          >
            선물하기
          </button>
          <button
            onClick={handleCheckout}
            className="bg-red-600 text-white py-3 text-lg font-semibold hover:bg-red-700"
          >
            주문하기
          </button>
        </div>
      </div>

      <Footer />

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
    </div>
  )
}

