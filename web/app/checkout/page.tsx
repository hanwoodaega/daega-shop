'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice, canUseKakaoDeepLink } from '@/lib/utils/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { useDaumPostcodeScript } from '@/lib/postcode/useDaumPostcode'
import { Coupon } from '@/lib/supabase/supabase'
import { useCheckoutController } from '@/lib/checkout/useCheckoutController'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { CouponModal } from '@/components/checkout/CouponModal'
import { GiftStep1Summary } from '@/components/checkout/GiftStep1Summary'
import { GiftSenderInfo } from '@/components/checkout/GiftSenderInfo'
import { OrdererInfo } from '@/components/checkout/OrdererInfo'
import { DeliveryFormQuick } from '@/components/checkout/DeliveryFormQuick'
import { DeliveryFormRegular } from '@/components/checkout/DeliveryFormRegular'
import { GiftMessageCard } from '@/components/checkout/GiftMessageCard'
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector'
import { OrderSummaryBox } from '@/components/checkout/OrderSummaryBox'
import { CheckoutBottomBar } from '@/components/checkout/CheckoutBottomBar'

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  // 선물 모드 확인
  const isGiftMode = searchParams?.get('mode') === 'gift'
  useEffect(() => {
    if (!isGiftMode) return
    if (canUseKakaoDeepLink()) return

    toast.error('카카오톡 앱이 설치된 모바일 환경에서만 선물하기를 이용할 수 있어요.', {
      icon: '📱',
    })
    router.replace('/cart')
  }, [isGiftMode, router])
  
  // ✅ Checkout Controller Hook 사용
  const { state, actions, derived } = useCheckoutController({ isGiftMode })
  
  // Destructuring for convenience
  const {
    deliveryState,
    formData,
    flags,
    availableCoupons,
    selectedCoupon,
    showCouponModal,
    loadingCoupons,
    userPoints,
    usedPoints,
    loadingPoints,
    usedPointsInput,
    paymentMethod,
    selectedCardId,
    savedCards,
    loadingCards,
    giftData,
    currentStep,
    items,
    isDirectPurchase,
  } = state

  const {
    setDeliveryState,
    setFormData,
    setFlags,
    setSelectedCoupon,
    setShowCouponModal,
    setUsedPoints,
    setUsedPointsInput,
    setPaymentMethod,
    setSelectedCardId,
    setGiftData,
    setCurrentStep,
    handleSubmit,
    handleNextStep,
    handleSearchAddress,
    loadAvailableCoupons,
    loadUserPoints,
    loadSavedCards,
    applyAddress,
    handleInputChange,
  } = actions

  const {
    deliveryMethod,
    pickupTime,
    quickDeliveryArea,
    quickDeliveryTime,
    isProcessing,
    mounted,
    saveAsDefaultAddress,
    isEditingOrderer,
    isGiftFinalStep,
    gridColumnsClass,
    originalTotal,
    discountAmount,
    shipping,
    discountedTotal,
    orderTotal,
    subtotal,
    couponDiscount,
    afterCouponDiscount,
    finalTotal,
    pickupTimeSlots,
    quickDeliveryAreas,
    quickDeliveryTimeSlots,
    defaultAddress,
    loadingDefaultAddress,
    hasDefaultAddress,
    userProfile,
    loadingUserProfile,
  } = derived

  const totalGiftSteps = 3

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

  useEffect(() => {
    setCurrentStep(1)
  }, [isGiftMode])

  // Daum 우편번호 스크립트 로드 (한 번만 실행)
  // 카카오 SDK 초기화는 useCheckoutController에서 처리됨
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

  // 모든 비즈니스 로직은 useCheckoutController에서 처리됨

  // 로딩 중
  if (loadingDefaultAddress) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                {isGiftMode ? '선물하기' : '주문/결제'}
              </h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <CheckoutHeader 
        isGiftMode={isGiftMode}
        currentStep={currentStep}
        totalGiftSteps={totalGiftSteps}
      />
      
      <main className={`flex-1 container mx-auto px-4 py-4 ${isGiftMode ? 'bg-gray-50' : ''}`}>

        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className={`grid grid-cols-1 ${gridColumnsClass} ${isGiftFinalStep ? 'gap-4' : 'gap-8'}`}>
            {/* 주문 정보 입력 */}
            <div className={`space-y-3 ${isGiftFinalStep ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
              {/* 선물할 상품 목록 - 선물 모드 1단계 */}
              {isGiftMode && currentStep === 1 && (
                <GiftStep1Summary
                  items={items}
                  originalTotal={originalTotal}
                  discountAmount={discountAmount}
                  finalTotal={finalTotal}
                  shipping={shipping}
                />
              )}

              {/* 보내는 분 정보 - 선물 모드 1단계일 때만 표시 */}
              {isGiftMode && currentStep === 1 && (
                <GiftSenderInfo
                  formData={formData}
                  isEditingOrderer={isEditingOrderer}
                  onEdit={() => setFlags(prev => ({ ...prev, isEditingOrderer: true }))}
                  onCancel={() => setFlags(prev => ({ ...prev, isEditingOrderer: false }))}
                  onSave={() => {
                              if (formData.name && formData.phone) {
                                setFlags(prev => ({ ...prev, isEditingOrderer: false }))
                              }
                            }}
                  onInputChange={handleInputChange}
                  onPhoneChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                />
              )}

              {/* 주문자 정보 - 선물 모드가 아닐 때만 표시 */}
              {!isGiftMode && (
                <OrdererInfo
                  formData={formData}
                  isEditingOrderer={isEditingOrderer}
                  onEdit={() => setFlags(prev => ({ ...prev, isEditingOrderer: true }))}
                  onCancel={() => setFlags(prev => ({ ...prev, isEditingOrderer: false }))}
                  onSave={() => {
                          if (formData.name && formData.phone) {
                            setFlags(prev => ({ ...prev, isEditingOrderer: false }))
                          }
                        }}
                  onInputChange={handleInputChange}
                  onPhoneChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                />
              )}

              {/* 배송 정보 - 퀵배달일 때 표시 (선물 모드가 아닐 때만) */}
              {!isGiftMode && deliveryMethod === 'quick' && (
                <DeliveryFormQuick
                  formData={formData}
                  hasDefaultAddress={hasDefaultAddress}
                  saveAsDefaultAddress={saveAsDefaultAddress}
                  onSearchAddress={handleSearchAddress}
                  onInputChange={handleInputChange}
                  onSaveAsDefaultChange={(checked) => setFlags(prev => ({ ...prev, saveAsDefaultAddress: checked }))}
                />
              )}

              {/* 배송 정보 - 택배배송일 때만 표시 (선물 모드가 아닐 때만) */}
              {!isGiftMode && deliveryMethod === 'regular' && (
                <DeliveryFormRegular
                  formData={formData}
                  defaultAddress={defaultAddress}
                  hasDefaultAddress={hasDefaultAddress}
                  saveAsDefaultAddress={saveAsDefaultAddress}
                  onSearchAddress={handleSearchAddress}
                  onInputChange={handleInputChange}
                  onSaveAsDefaultChange={(checked) => setFlags(prev => ({ ...prev, saveAsDefaultAddress: checked }))}
                />
              )}

              {/* 선물 옵션 - 선물 모드 2단계 */}
              {isGiftMode && currentStep === 2 && (
                <GiftMessageCard
                  giftData={giftData}
                  onWithMessageChange={(withMessage) => setGiftData(prev => ({ ...prev, withMessage }))}
                  onCardDesignChange={(design) => setGiftData(prev => ({ ...prev, cardDesign: design as any }))}
                  onMessageChange={(message) => setGiftData(prev => ({ ...prev, message }))}
                />
              )}

              {/* 쿠폰 선택 */}
              {(!isGiftMode || currentStep === 3) && (
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
              )}

              {/* 포인트 사용 */}
              {(!isGiftMode || currentStep === 3) && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-3">포인트</h2>
                {loadingPoints ? (
                  <div className="text-sm text-gray-500">포인트 조회 중...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">보유 포인트</span>
                      <span className="text-sm font-semibold text-primary-900">
                        {userPoints.toLocaleString()}P
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        사용할 포인트
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={usedPointsInput}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            // 허용: 빈 문자열 또는 숫자
                            setUsedPointsInput(raw)
                          }}
                          onBlur={() => {
                            const parsed = parseInt(usedPointsInput || '0', 10) || 0
                            const maxPoints = Math.min(userPoints, Math.max(0, afterCouponDiscount))
                            setUsedPoints(Math.min(parsed, maxPoints))
                          }}
                          className="flex-1 px-1.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const maxPoints = Math.min(userPoints, Math.max(0, afterCouponDiscount))
                            setUsedPoints(maxPoints)
                            setUsedPointsInput(String(maxPoints))
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                        >
                          전액사용
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        최대 {Math.min(userPoints, Math.max(0, afterCouponDiscount)).toLocaleString()}P 사용 가능
                      </p>
                    </div>
                    {usedPoints > 0 && (
                      <button
                        type="button"
                        onClick={() => setUsedPoints(0)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        포인트 사용 취소
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* 결제 방법 */}
              {(!isGiftMode || currentStep === 3) && (
                <PaymentMethodSelector
                  paymentMethod={paymentMethod}
                  selectedCardId={selectedCardId}
                  savedCards={savedCards}
                  loadingCards={loadingCards}
                  onPaymentMethodChange={setPaymentMethod}
                  onCardSelect={setSelectedCardId}
                />
              )}
            </div>

            {/* 주문 요약 */}
            {isGiftFinalStep && (
            <div className="lg:col-span-1">
                <OrderSummaryBox
                  isGiftMode={isGiftMode}
                  deliveryMethod={deliveryMethod}
                  pickupTime={pickupTime}
                  quickDeliveryArea={quickDeliveryArea}
                  quickDeliveryTime={quickDeliveryTime}
                  mounted={mounted}
                  originalTotal={originalTotal}
                  discountAmount={discountAmount}
                  couponDiscount={couponDiscount}
                  usedPoints={usedPoints}
                  shipping={shipping}
                  finalTotal={finalTotal}
                />
            </div>
            )}
          </div>
        </form>

        {/* 하단 고정 버튼 */}
        {mounted && (
          <CheckoutBottomBar
            isGiftMode={isGiftMode}
            currentStep={currentStep}
            totalGiftSteps={totalGiftSteps}
            isProcessing={isProcessing}
            finalTotal={finalTotal}
            shipping={shipping}
            onNextStep={handleNextStep}
          />
        )}
      </main>

      <CouponModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        availableCoupons={availableCoupons}
        selectedCoupon={selectedCoupon}
        onSelectCoupon={setSelectedCoupon}
        loadingCoupons={loadingCoupons}
        subtotal={subtotal}
      />

    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                주문/결제
              </h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8 pb-24">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  )
}

