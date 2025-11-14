'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useDaumPostcodeScript, openDaumPostcode, AddressSearchResult } from '@/lib/hooks/useDaumPostcode'
import { showError, showSuccess, handleSupabaseError, showInfo } from '@/lib/error-handler'
import { useDefaultAddress, useUserProfile } from '@/lib/hooks/useAddress'
import { calculateOrderTotal } from '@/lib/order-calc'
import { getUserCoupons, isCouponValid } from '@/lib/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const cartItems = useCartStore((state) => state.items)
  const getCartTotalPrice = useCartStore((state) => state.getTotalPrice)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSelectedItems = useCartStore((state) => state.getSelectedItems)
  
  const directPurchaseItems = useDirectPurchaseStore((state) => state.items)
  const getDirectPurchaseTotalPrice = useDirectPurchaseStore((state) => state.getTotalPrice)
  const clearDirectPurchase = useDirectPurchaseStore((state) => state.clearItems)
  
  // 바로구매가 있으면 그것을 사용, 없으면 장바구니 선택 상품 사용
  const isDirectPurchase = directPurchaseItems.length > 0
  const items = isDirectPurchase ? directPurchaseItems : getSelectedItems()
  const getTotalPrice = isDirectPurchase ? getDirectPurchaseTotalPrice : getCartTotalPrice
  
  // ✅ 배송 관련 state 그룹화
  const [deliveryState, setDeliveryState] = useState({
    method: 'regular' as 'pickup' | 'quick' | 'regular',
    pickupTime: '',
    quickDeliveryArea: '',
    quickDeliveryTime: '',
  })
  
  // ✅ 폼 데이터 (이미 그룹화됨)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    addressDetail: '',
    zipcode: '',
    message: '',
  })
  
  // ✅ 플래그 state 그룹화
  const [flags, setFlags] = useState({
    isProcessing: false,
    mounted: false,
    saveAsDefaultAddress: false,
  })

  // 쿠폰 관련 state
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // Destructuring for backward compatibility
  const { method: deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime } = deliveryState
  const { isProcessing, mounted, saveAsDefaultAddress } = flags

  // ✅ 공통 hook 사용
  const { address: defaultAddress, loading: loadingDefaultAddress, hasDefaultAddress } = useDefaultAddress()
  const { profile: userProfile, loading: loadingUserProfile } = useUserProfile()

  // 클라이언트 마운트 확인 및 장바구니에서 선택한 배송 방법 불러오기
  useEffect(() => {
    setFlags(prev => ({ ...prev, mounted: true }))
    
    // 세션 스토리지에서 배송 방법 및 관련 정보 불러오기
    const savedDeliveryMethod = sessionStorage.getItem('deliveryMethod') as 'pickup' | 'quick' | 'regular' | null
    const savedPickupTime = sessionStorage.getItem('pickupTime') || ''
    const savedQuickArea = sessionStorage.getItem('quickDeliveryArea') || ''
    const savedQuickTime = sessionStorage.getItem('quickDeliveryTime') || ''
    
    if (savedDeliveryMethod) {
      setDeliveryState(prev => ({ 
        ...prev, 
        method: savedDeliveryMethod,
        pickupTime: savedPickupTime,
        quickDeliveryArea: savedQuickArea,
        quickDeliveryTime: savedQuickTime,
      }))
    }
  }, [])

  // Daum 우편번호 스크립트 로드
  useDaumPostcodeScript()

  // 기본 배송지 적용
  useEffect(() => {
    if (defaultAddress) {
      applyAddress(defaultAddress)
    } else if (!hasDefaultAddress) {
      // 배송지가 하나도 없으면 체크박스 자동 체크
      setFlags(prev => ({ ...prev, saveAsDefaultAddress: true }))
    }
  }, [defaultAddress, hasDefaultAddress])

  // 사용자 정보 적용
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || userProfile.name || '',
        phone: prev.phone || userProfile.phone || '',
        email: prev.email || userProfile.email || user?.email || '',
      }))
    }
  }, [userProfile, user?.email])

  // 사용 가능한 쿠폰 로드
  useEffect(() => {
    if (user?.id) {
      loadAvailableCoupons()
    }
  }, [user?.id])

  const loadAvailableCoupons = async () => {
    if (!user?.id) return

    setLoadingCoupons(true)
    try {
      const coupons = await getUserCoupons(user.id, false)
      // 유효기간 내 쿠폰만 필터링
      const validCoupons = coupons.filter(uc => {
        const coupon = uc.coupon as Coupon
        return isCouponValid(uc, coupon)
      })
      setAvailableCoupons(validCoupons)
    } catch (error) {
      console.error('쿠폰 조회 실패:', error)
    } finally {
      setLoadingCoupons(false)
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
    openDaumPostcode((data: AddressSearchResult) => {
      setFormData(prev => ({
        ...prev,
        zipcode: data.zonecode,
        address: data.address,
      }))

      setTimeout(() => {
        const detailInput = document.getElementById('checkout_address_detail')
        if (detailInput) {
          detailInput.focus()
        }
      }, 100)
    })
  }

  const getDeliveryFee = () => {
    if (deliveryMethod === 'pickup') return 0
    if (deliveryMethod === 'quick') return 5000
    // 일반 택배
    return getTotalPrice() >= 50000 ? 0 : 3000
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      showError({ message: '주문할 상품이 없습니다.' }, { icon: '📦' })
      router.push(isDirectPurchase ? '/products' : '/cart')
      return
    }

    if (!formData.name || !formData.phone) {
      showError({ message: '필수 항목을 모두 입력해주세요.' }, { icon: '⚠️' })
      return
    }

    // 배송 방법별 유효성 검사
    if (deliveryMethod === 'pickup' && !pickupTime) {
      showError({ message: '픽업 시간을 선택해주세요.' }, { icon: '⏰' })
      return
    }

    if (deliveryMethod === 'quick') {
      if (!quickDeliveryArea) {
        showError({ message: '배달 지역을 선택해주세요.' }, { icon: '📍' })
        return
      }
      if (!formData.address) {
        showError({ message: '상세 주소를 입력해주세요.' }, { icon: '📍' })
        return
      }
      if (!quickDeliveryTime) {
        showError({ message: '배달 시간을 선택해주세요.' }, { icon: '⏰' })
        return
      }
    }

    if (deliveryMethod === 'regular' && !formData.address) {
      showError({ message: '배송 주소를 입력해주세요.' }, { icon: '📍' })
      return
    }

    setFlags(prev => ({ ...prev, isProcessing: true }))

    try {
      // 로그인 확인
      if (!user) {
        showError({ message: '로그인이 필요합니다.' }, { icon: '🔒' })
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
      
      // 주문 저장 (API 통해서)
      const deliveryTime = deliveryMethod === 'pickup' 
        ? pickupTime 
        : deliveryMethod === 'quick' 
        ? quickDeliveryTime 
        : null

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_amount: totalAmount,
          delivery_type: deliveryMethod,
          delivery_time: deliveryTime,
          shipping_address: shippingAddress,
          shipping_name: formData.name,
          shipping_phone: formData.phone,
          delivery_note: formData.message.trim() || null,
          used_coupon_id: selectedCoupon?.id || null,
          used_points: 0, // 포인트는 나중에 추가
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '주문 생성 실패')
      }

      const { order } = await response.json()

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

      // 바로구매면 세션 스토리지 비우기, 아니면 장바구니 비우기
      if (isDirectPurchase) {
        clearDirectPurchase()
      } else {
        clearCart()
      }

      // 주문 완료
      showSuccess('주문이 완료되었습니다!', {
        icon: '🎉',
        duration: 3000,
      })

      // 주문 완료 페이지로 이동
      setTimeout(() => {
        router.push('/orders')
      }, 1500)

    } catch (error) {
      showError(error)
    } finally {
      setFlags(prev => ({ ...prev, isProcessing: false }))
    }
  }

  // 쿠폰 할인 금액 계산
  const calculateCouponDiscount = (subtotal: number): number => {
    if (!selectedCoupon || !selectedCoupon.coupon) return 0

    const coupon = selectedCoupon.coupon as Coupon
    
    // 최소 구매 금액 체크
    if (coupon.min_purchase_amount && subtotal < coupon.min_purchase_amount) {
      return 0
    }

    if (coupon.discount_type === 'percentage') {
      const discount = Math.floor(subtotal * (coupon.discount_value / 100))
      if (coupon.max_discount_amount) {
        return Math.min(discount, coupon.max_discount_amount)
      }
      return discount
    } else {
      return coupon.discount_value
    }
  }

  // 주문 금액 계산 (통합 유틸리티 사용)
  const { originalTotal, discountAmount, shipping, total: subtotal } = calculateOrderTotal(items, deliveryMethod)
  const couponDiscount = calculateCouponDiscount(subtotal)
  const total = Math.max(0, subtotal - couponDiscount)

  // 로딩 중
  if (loadingDefaultAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </div>
          
          <div className="animate-pulse space-y-6">
            {/* 배송 방법 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
            
            {/* 주문자 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">주문/결제</h1>
        </div>

        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 주문 정보 입력 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 주문자 정보 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">주문자</h2>
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
                      maxLength={50}
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
                          onChange={(e) => setFlags(prev => ({ ...prev, saveAsDefaultAddress: e.target.checked }))}
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
                
                {/* 기본 배송지가 있으면 텍스트로 표시 */}
                {defaultAddress ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-bold text-gray-900">{defaultAddress.name}</h3>
                            <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">기본</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            {defaultAddress.recipient_name} · {defaultAddress.recipient_phone}
                          </p>
                          <p className="text-sm text-gray-700">
                            {defaultAddress.address}
                            {defaultAddress.address_detail && ` ${defaultAddress.address_detail}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push('/profile/addresses')}
                          className="ml-4 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition whitespace-nowrap"
                        >
                          배송지 변경
                        </button>
                      </div>
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
                        maxLength={50}
                        placeholder="예: 공동현관 비밀번호 #1234, 문 앞에 놓아주세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  /* 기본 배송지가 없으면 입력 필드 표시 */
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
                        maxLength={50}
                        placeholder="예: 공동현관 비밀번호 #1234, 문 앞에 놓아주세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    {/* 기본 배송지로 저장 체크박스 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="save_as_default"
                          checked={saveAsDefaultAddress}
                          onChange={(e) => setFlags(prev => ({ ...prev, saveAsDefaultAddress: e.target.checked }))}
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
                  </div>
                )}
              </div>
              )}

              {/* 쿠폰 선택 */}
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-3">쿠폰</h2>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowCouponModal(true)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-left hover:border-primary-500 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        {selectedCoupon ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {(selectedCoupon.coupon as Coupon)?.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {couponDiscount > 0 && `-${formatPrice(couponDiscount)}원 할인`}
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-600">
                            사용 가능한 쿠폰 {availableCoupons.length}개
                          </div>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  {selectedCoupon && (
                    <button
                      type="button"
                      onClick={() => setSelectedCoupon(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      쿠폰 취소
                    </button>
                  )}
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
                <h2 className="text-xl font-bold mb-4">주문 요약</h2>
                
                {/* 배송 방법 표시 */}
                <div className="mb-2 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">배송 방법</span>
                    <span className="font-semibold">
                      {deliveryMethod === 'pickup' && '픽업'}
                      {deliveryMethod === 'quick' && '퀵배송'}
                      {deliveryMethod === 'regular' && '택배배송'}
                    </span>
                  </div>
                  {deliveryMethod === 'pickup' && pickupTime && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-600">픽업 시간</span>
                      <span className="font-semibold">{pickupTime}</span>
                    </div>
                  )}
                  {deliveryMethod === 'quick' && (
                    <>
                      {quickDeliveryArea && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-gray-600">배달 지역</span>
                          <span className="font-semibold">{quickDeliveryArea}</span>
                        </div>
                      )}
                      {quickDeliveryTime && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-gray-600">배달 시간</span>
                          <span className="font-semibold">{quickDeliveryTime}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {mounted ? (
                  <>
                    <div className="border-t pt-4 space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-600">상품 금액</span>
                        <span className="font-semibold">{formatPrice(originalTotal)}원</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">즉시할인</span>
                          <span className="font-semibold text-red-600">-{formatPrice(discountAmount)}원</span>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">쿠폰 할인</span>
                          <span className="font-semibold text-red-600">-{formatPrice(couponDiscount)}원</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">배송비</span>
                        <span className="font-semibold">
                          {shipping === 0 ? '무료' : `${formatPrice(shipping)}원`}
                        </span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>결제 예상 금액</span>
                          <span className="text-primary-900">{formatPrice(total)}원</span>
                        </div>
                      </div>
                    </div>

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

        {/* 하단 고정 결제 버튼 */}
        {mounted && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg">
            <div className="px-0 pb-6">
              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full bg-red-600 text-white py-3 text-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    처리 중...
                  </>
                ) : (
                  <>
                    <span>{formatPrice(total)}원 결제하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 쿠폰 선택 모달 */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">쿠폰 선택</h2>
              <button
                onClick={() => setShowCouponModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {loadingCoupons ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
                </div>
              ) : availableCoupons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  사용 가능한 쿠폰이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedCoupon(null)
                      setShowCouponModal(false)
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                      !selectedCoupon
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">쿠폰 미사용</div>
                  </button>

                  {availableCoupons.map((userCoupon) => {
                    const coupon = userCoupon.coupon as Coupon
                    const isSelected = selectedCoupon?.id === userCoupon.id
                    const canUse = !coupon.min_purchase_amount || subtotal >= coupon.min_purchase_amount

                    return (
                      <button
                        key={userCoupon.id}
                        onClick={() => {
                          if (canUse) {
                            setSelectedCoupon(userCoupon)
                            setShowCouponModal(false)
                          }
                        }}
                        disabled={!canUse}
                        className={`w-full p-4 border-2 rounded-lg text-left transition ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : canUse
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 mb-1">{coupon.name}</div>
                            {coupon.description && (
                              <div className="text-sm text-gray-600 mb-2">{coupon.description}</div>
                            )}
                            <div className="text-sm text-gray-500">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}% 할인`
                                : `${formatPrice(coupon.discount_value)}원 할인`}
                              {coupon.min_purchase_amount && (
                                <span className="ml-2">
                                  (최소 {formatPrice(coupon.min_purchase_amount)}원 이상 구매)
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-primary-800 font-bold">✓</span>
                          )}
                        </div>
                        {!canUse && (
                          <div className="text-xs text-red-600 mt-2">
                            최소 구매 금액 미달
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pb-20">
        <Footer />
      </div>
    </div>
  )
}

