'use client'

import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/lib/store'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('장바구니가 비어있습니다.')
      return
    }
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">장바구니</h1>

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
                <div key={item.productId} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start space-x-4">
                    {/* 상품 이미지 */}
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0"></div>

                    {/* 상품 정보 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
                      <p className="text-gray-600 mb-2">
                        {formatPrice(item.price)}원 / {item.unit}
                      </p>

                      {/* 수량 조절 */}
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 가격 및 삭제 */}
                    <div className="text-right">
                      <p className="text-xl font-bold mb-2">
                        {formatPrice(item.price * item.quantity)}원
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 장바구니 비우기 */}
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                장바구니 비우기
              </button>
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
                  onClick={handleCheckout}
                  className="w-full bg-primary-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-900 transition"
                >
                  주문하기
                </button>

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

      <Footer />
    </div>
  )
}

