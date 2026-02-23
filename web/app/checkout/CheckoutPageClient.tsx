'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { useDaumPostcodeScript } from '@/lib/postcode/useDaumPostcode'
import { Coupon } from '@/lib/supabase/supabase'
import { useCheckout } from '@/lib/checkout'
import {
  CheckoutHeader,
  CouponModal,
  GiftStep1Summary,
  GiftSenderInfo,
  OrdererInfo,
  DeliveryFormQuick,
  DeliveryFormRegular,
  GiftMessageCard,
  PaymentMethodSelector,
  OrderSummaryBox,
  CheckoutBottomBar,
} from './_components'

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const isGiftMode = searchParams?.get('mode') === 'gift'

  useEffect(() => {
    if (!isGiftMode) return
  }, [isGiftMode])
  
  const { state, actions, derived } = useCheckout({ isGiftMode })
  
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
    setGiftData,
    setCurrentStep,
    setSelectedCardId,
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

  useEffect(() => {
    setCurrentStep(1)
  }, [isGiftMode, setCurrentStep])

  useDaumPostcodeScript()

  useEffect(() => {
    if (defaultAddress) {
      applyAddress(defaultAddress)
    } else if (!hasDefaultAddress) {
      setFlags(prev => ({ ...prev, saveAsDefaultAddress: true }))
    }
  }, [defaultAddress, hasDefaultAddress, applyAddress, setFlags])

  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || userProfile.name || '',
        phone: prev.phone || userProfile.phone || '',
        email: prev.email || user?.email || '',
      }))
    }
  }, [userProfile, user?.email, setFormData])

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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
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
      <Script src="https://js.tosspayments.com/v1" strategy="afterInteractive" />
      <CheckoutHeader
        isGiftMode={isGiftMode}
        currentStep={currentStep}
        totalGiftSteps={totalGiftSteps}
      />
      
      <main
        className={`flex-1 container mx-auto px-4 py-4 ${
          isGiftMode ? 'bg-gray-50' : ''
        } ${isGiftMode && currentStep === 1 ? 'pb-24 md:pb-32' : ''}`}
      >
        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className={`grid grid-cols-1 ${gridColumnsClass} ${isGiftFinalStep ? 'gap-4' : 'gap-8'}`}>
            <div className={`space-y-3 ${isGiftFinalStep ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
              {isGiftMode && currentStep === 1 && (
                <GiftStep1Summary
                  items={items}
                  originalTotal={originalTotal}
                  discountAmount={discountAmount}
                  finalTotal={finalTotal}
                  shipping={shipping}
                />
              )}

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

              {isGiftMode && currentStep === 2 && (
                <GiftMessageCard
                  giftData={giftData}
                  onWithMessageChange={(withMessage) => setGiftData(prev => ({ ...prev, withMessage }))}
                  onCardDesignChange={(design) => setGiftData(prev => ({ ...prev, cardDesign: design as any }))}
                  onMessageChange={(message) => setGiftData(prev => ({ ...prev, message }))}
                />
              )}

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

export default function CheckoutPageClient() {
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


