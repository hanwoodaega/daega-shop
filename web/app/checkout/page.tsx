'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCartStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// Daum 우편번호 서비스 타입 정의
declare global {
  interface Window {
    daum: any
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, getTotalPrice, clearCart, getSelectedItems } = useCartStore()
  
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'quick' | 'regular'>('regular')
  const [pickupTime, setPickupTime] = useState('')
  const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
  const [quickDeliveryTime, setQuickDeliveryTime] = useState('')
  
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
  const [mounted, setMounted] = useState(false)
  const [loadingDefaultAddress, setLoadingDefaultAddress] = useState(true)
  const [saveAsDefaultAddress, setSaveAsDefaultAddress] = useState(false)
  const [hasDefaultAddress, setHasDefaultAddress] = useState(false)

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // Daum 우편번호 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // 기본 배송지 불러오기
  useEffect(() => {
    if (user) {
      loadDefaultAddress()
    } else {
      setLoadingDefaultAddress(false)
    }
  }, [user])

  const loadDefaultAddress = async () => {
    try {
      // 기본 배송지 조회
      const { data: defaultAddress, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .single()

      if (error) {
        // 기본 배송지가 없으면 첫 번째 배송지 조회
        const { data: firstAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (firstAddress) {
          applyAddress(firstAddress)
          setHasDefaultAddress(true)
        } else {
          // 배송지가 하나도 없음 - 체크박스 자동 체크
          setHasDefaultAddress(false)
          setSaveAsDefaultAddress(true)
        }
      } else if (defaultAddress) {
        applyAddress(defaultAddress)
        setHasDefaultAddress(true)
      }

      // 사용자 정보도 불러오기
      const { data: userData } = await supabase
        .from('users')
        .select('name, phone, email')
        .eq('id', user!.id)
        .single()

      if (userData) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || userData.name || '',
          phone: prev.phone || userData.phone || '',
          email: prev.email || user!.email || '',
        }))
      }
    } catch (error) {
      console.error('기본 배송지 조회 실패:', error)
      setHasDefaultAddress(false)
    } finally {
      setLoadingDefaultAddress(false)
    }
  }

  const applyAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || address.recipient_name || '',
      phone: prev.phone || address.recipient_phone || '',
      zipcode: address.zipcode || '',
      address: address.address || '',
      addressDetail: address.address_detail || '',
      message: address.delivery_note || '',
    }))
  }

  // 픽업 가능 시간대 (오전 10시 ~ 오후 8시)
  const pickupTimeSlots = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00'
  ]

  // 퀵배달 가능 지역
  const quickDeliveryAreas = [
    '연향동', '조례동', '풍덕동', '해룡면'
  ]

  // 퀵배달 시간대 (오전 10시 ~ 오후 10시)
  const quickDeliveryTimeSlots = [
    '10:00~11:00', '11:00~12:00', '12:00~13:00',
    '13:00~14:00', '14:00~15:00', '15:00~16:00',
    '16:00~17:00', '17:00~18:00', '18:00~19:00',
    '19:00~20:00', '20:00~21:00',     '21:00~22:00'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSearchAddress = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        let fullAddress = data.address
        let extraAddress = ''

        if (data.addressType === 'R') {
          if (data.bname !== '') {
            extraAddress += data.bname
          }
          if (data.buildingName !== '') {
            extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName)
          }
          fullAddress += (extraAddress !== '' ? ' (' + extraAddress + ')' : '')
        }

        setFormData(prev => ({
          ...prev,
          zipcode: data.zonecode,
          address: fullAddress,
        }))

        setTimeout(() => {
          const detailInput = document.getElementById('checkout_address_detail')
          if (detailInput) {
            detailInput.focus()
          }
        }, 100)
      }
    }).open()
  }

  const getDeliveryFee = () => {
    if (deliveryMethod === 'pickup') return 0
    if (deliveryMethod === 'quick') return 5000
    // 일반 택배
    return getTotalPrice() >= 50000 ? 0 : 3000
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
      alert('주문할 상품을 선택해주세요.')
      router.push('/cart')
      return
    }

    if (!formData.name || !formData.phone) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    // 배송 방법별 유효성 검사
    if (deliveryMethod === 'pickup' && !pickupTime) {
      alert('픽업 시간을 선택해주세요.')
      return
    }

    if (deliveryMethod === 'quick') {
      if (!quickDeliveryArea) {
        alert('배달 지역을 선택해주세요.')
        return
      }
      if (!formData.address) {
        alert('상세 주소를 입력해주세요.')
        return
      }
      if (!quickDeliveryTime) {
        alert('배달 시간을 선택해주세요.')
        return
      }
    }

    if (deliveryMethod === 'regular' && !formData.address) {
      alert('배송 주소를 입력해주세요.')
      return
    }

    setIsProcessing(true)

    try {
      // 로그인 확인
      if (!user) {
        alert('로그인이 필요합니다.')
        router.push('/auth/login?next=/checkout')
        return
      }

      // 주문 생성
      const shippingAddress = deliveryMethod === 'pickup'
        ? '매장 픽업'
        : deliveryMethod === 'quick'
        ? `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
        : `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
      
      const deliveryFee = getDeliveryFee()
      const totalAmount = getTotalPrice() + deliveryFee

      // 실제로는 여기서 결제 API를 호출합니다 (토스페이먼츠, 카카오페이 등)
      // 데모를 위해 주문 정보만 저장하고 완료 페이지로 이동
      
      // 주문 저장
      const deliveryTime = deliveryMethod === 'pickup' 
        ? pickupTime 
        : deliveryMethod === 'quick' 
        ? quickDeliveryTime 
        : null

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: 'paid',
          delivery_type: deliveryMethod,
          delivery_time: deliveryTime,
          shipping_address: shippingAddress,
          shipping_name: formData.name,
          shipping_phone: formData.phone,
          delivery_note: formData.message.trim() || null,
        })
        .select()
        .single()

      if (orderError) {
        console.error('주문 생성 실패:', orderError)
        alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
        return
      }

      // 주문 아이템 저장
      if (order) {
        const orderItems = selectedItems.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))

        await supabase.from('order_items').insert(orderItems)
      }

      // 기본 배송지로 저장 체크 시 배송지 저장 (택배 또는 퀵배달)
      if (saveAsDefaultAddress && (deliveryMethod === 'regular' || deliveryMethod === 'quick') && formData.address) {
        try {
          await supabase.from('addresses').insert({
            user_id: user.id,
            name: deliveryMethod === 'quick' ? '퀵배달 주소' : '기본 배송지',
            recipient_name: formData.name,
            recipient_phone: formData.phone,
            zipcode: formData.zipcode || null,
            address: formData.address,
            address_detail: formData.addressDetail || null,
            delivery_note: formData.message || null,
            is_default: true,
          })
        } catch (error) {
          console.error('배송지 저장 실패:', error)
          // 배송지 저장 실패해도 주문은 완료
        }
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

  const selectedItems = getSelectedItems()
  const subtotal = getTotalPrice()
  const shipping = getDeliveryFee()
  const total = subtotal + shipping

  // 로딩 중
  if (loadingDefaultAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800 mx-auto mb-4"></div>
            <p className="text-gray-600">배송 정보를 불러오는 중...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">주문/결제</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 주문 정보 입력 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 배송 방법 선택 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">배송 방법</h2>
                <div className="space-y-4">
                  {/* 오늘 픽업 */}
                  <label className="flex items-start space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:border-primary-500 transition"
                    style={{ borderColor: deliveryMethod === 'pickup' ? '#b45309' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={() => setDeliveryMethod('pickup')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">오늘 픽업</div>
                      <div className="text-sm text-gray-600 mt-1">매장에서 직접 픽업 • 무료</div>
                      {deliveryMethod === 'pickup' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium mb-2">픽업 시간 선택</label>
                          <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            required
                          >
                            <option value="">시간을 선택하세요</option>
                            {pickupTimeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* 퀵배달 */}
                  <label className="flex items-start space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:border-primary-500 transition"
                    style={{ borderColor: deliveryMethod === 'quick' ? '#b45309' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="quick"
                      checked={deliveryMethod === 'quick'}
                      onChange={() => setDeliveryMethod('quick')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">퀵배달</div>
                      <div className="text-sm text-gray-600 mt-1">1~2시간 내 신속 배달 • 5,000원</div>
                      {deliveryMethod === 'quick' && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">배달 지역 선택</label>
                            <select
                              value={quickDeliveryArea}
                              onChange={(e) => setQuickDeliveryArea(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              required
                            >
                              <option value="">지역을 선택하세요</option>
                              {quickDeliveryAreas.map(area => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">배달 시간대 선택</label>
                            <select
                              value={quickDeliveryTime}
                              onChange={(e) => setQuickDeliveryTime(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              required
                            >
                              <option value="">시간대를 선택하세요</option>
                              {quickDeliveryTimeSlots.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* 일반 택배 */}
                  <label className="flex items-start space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:border-primary-500 transition"
                    style={{ borderColor: deliveryMethod === 'regular' ? '#b45309' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="regular"
                      checked={deliveryMethod === 'regular'}
                      onChange={() => setDeliveryMethod('regular')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">택배배송</div>
                      <div className="text-sm text-gray-600 mt-1">
                        2~3일 내 배송 • {subtotal >= 50000 ? '무료' : '3,000원'}
                        {subtotal < 50000 && <span className="text-primary-600"> (5만원 이상 무료)</span>}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

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
                      onChange={(e) => {
                        // 숫자만 추출 (하이픈 자동 제거)
                        const numbers = e.target.value.replace(/[^0-9]/g, '')
                        setFormData(prev => ({ ...prev, phone: numbers }))
                      }}
                      required
                      placeholder="01012345678"
                      maxLength={11}
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

              {/* 배송 정보 - 퀵배달일 때 표시 */}
              {deliveryMethod === 'quick' && (
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
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="우편번호"
                      />
                      <button
                        type="button"
                        onClick={handleSearchAddress}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
                      >
                        주소찾기
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
                      readOnly
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="주소찾기 버튼을 클릭하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      상세 주소
                    </label>
                    <input
                      type="text"
                      id="quick_address_detail"
                      name="addressDetail"
                      value={formData.addressDetail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="101동 101호"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      배송 요청사항
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="예: 공동현관 비밀번호 #1234, 전화주세요"
                    />
                  </div>

                  {/* 기본 배송지로 저장 체크박스 - 퀵배달 */}
                  {!hasDefaultAddress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="save_as_default_quick"
                          checked={saveAsDefaultAddress}
                          onChange={(e) => setSaveAsDefaultAddress(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="save_as_default_quick" className="ml-2 text-sm text-blue-900">
                          <span className="font-semibold">이 주소를 기본 배송지로 저장</span>
                          <p className="text-xs text-blue-700 mt-1">
                            다음 주문부터 자동으로 입력됩니다.
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* 배송 정보 - 택배배송일 때만 표시 */}
              {deliveryMethod === 'regular' && (
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
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="우편번호"
                      />
                      <button
                        type="button"
                        onClick={handleSearchAddress}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
                      >
                        주소찾기
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
                      readOnly
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="주소찾기 버튼을 클릭하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      상세 주소
                    </label>
                    <input
                      type="text"
                      id="checkout_address_detail"
                      name="addressDetail"
                      value={formData.addressDetail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="101동 101호"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      배송 요청사항
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="예: 공동현관 비밀번호 #1234, 문 앞에 놓아주세요"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* 기본 배송지로 저장 체크박스 */}
                  {!hasDefaultAddress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="save_as_default"
                          checked={saveAsDefaultAddress}
                          onChange={(e) => setSaveAsDefaultAddress(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="save_as_default" className="ml-2 text-sm text-blue-900">
                          <span className="font-semibold">이 주소를 기본 배송지로 저장</span>
                          <p className="text-xs text-blue-700 mt-1">
                            다음 주문부터 자동으로 입력됩니다.
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

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
                  {selectedItems.map((item) => {
                    const itemPrice = item.discount_percent && item.discount_percent > 0
                      ? Math.round(item.price * (100 - item.discount_percent) / 100)
                      : item.price
                    return (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="flex-1 truncate">{item.name} x {item.quantity}</span>
                        <span className="font-semibold ml-2">{formatPrice(itemPrice * item.quantity)}원</span>
                      </div>
                    )
                  })}
                </div>

                {mounted ? (
                  <>
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
                          <span className="text-primary-900">{formatPrice(total)}원</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-primary-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-900 transition disabled:bg-gray-400"
                    >
                      {isProcessing ? '처리 중...' : `${formatPrice(total)}원 결제하기`}
                    </button>
                  </>
                ) : (
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-center py-8">
                      <div className="animate-pulse text-gray-400">계산 중...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  )
}

