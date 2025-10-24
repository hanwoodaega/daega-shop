'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCartStore()
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    addressDetail: '',
    zipcode: '',
    message: '',
  })
  
  const [isProcessing, setIsProcessing] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      alert('장바구니가 비어있습니다.')
      router.push('/cart')
      return
    }

    if (!formData.name || !formData.phone || !formData.address) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    setIsProcessing(true)

    try {
      // 주문 생성 (실제 환경에서는 Supabase에 저장)
      const shippingAddress = `${formData.address} ${formData.addressDetail}`
      const totalAmount = getTotalPrice() + (getTotalPrice() >= 50000 ? 0 : 3000)

      // 실제로는 여기서 결제 API를 호출합니다 (토스페이먼츠, 카카오페이 등)
      // 데모를 위해 주문 정보만 저장하고 완료 페이지로 이동
      
      // 주문 저장 (데모용 - 실제로는 user_id 필요)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // 데모용 UUID
          total_amount: totalAmount,
          status: 'paid',
          shipping_address: shippingAddress,
          shipping_name: formData.name,
          shipping_phone: formData.phone,
        })
        .select()
        .single()

      if (orderError) {
        console.error('주문 생성 실패:', orderError)
        // 에러가 나도 계속 진행 (데모용)
      }

      // 주문 아이템 저장
      if (order) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))

        await supabase.from('order_items').insert(orderItems)
      }

      // 장바구니 비우기
      clearCart()

      // 주문 완료 페이지로 이동
      alert('주문이 완료되었습니다!')
      router.push('/')
    } catch (error) {
      console.error('결제 처리 실패:', error)
      alert('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const subtotal = getTotalPrice()
  const shipping = subtotal >= 50000 ? 0 : 3000
  const total = subtotal + shipping

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">주문/결제</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 주문 정보 입력 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 주문자 정보 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">주문자 정보</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="010-0000-0000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 배송 정보 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">배송 정보</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      우편번호
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="zipcode"
                        value={formData.zipcode}
                        onChange={handleInputChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                      >
                        우편번호 찾기
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      주소 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      상세 주소
                    </label>
                    <input
                      type="text"
                      name="addressDetail"
                      value={formData.addressDetail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      배송 메시지
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="배송 시 요청사항을 입력해주세요"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 결제 방법 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">결제 방법</h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="radio" name="payment" value="card" defaultChecked className="w-4 h-4" />
                    <span>신용카드</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="radio" name="payment" value="transfer" className="w-4 h-4" />
                    <span>계좌이체</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="radio" name="payment" value="kakaopay" className="w-4 h-4" />
                    <span>카카오페이</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="radio" name="payment" value="tosspay" className="w-4 h-4" />
                    <span>토스페이</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">주문 상품</h2>
                
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="flex-1 truncate">{item.name} x {item.quantity}</span>
                      <span className="font-semibold ml-2">{formatPrice(item.price * item.quantity)}원</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 금액</span>
                    <span className="font-semibold">{formatPrice(subtotal)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span className="font-semibold">
                      {shipping === 0 ? '무료' : `${formatPrice(shipping)}원`}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-primary-600">{formatPrice(total)}원</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition disabled:bg-gray-400"
                >
                  {isProcessing ? '처리 중...' : `${formatPrice(total)}원 결제하기`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  )
}

