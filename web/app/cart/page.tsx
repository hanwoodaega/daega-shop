'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ProductCard from '@/components/ProductCard'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import FreeShippingProgress from '@/components/FreeShippingProgress'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { CartHeader } from '@/components/cart/CartHeader'
import { DeliveryMethodSelector } from '@/components/cart/DeliveryMethodSelector'
import { OrderSummary } from '@/components/cart/OrderSummary'
import { AddressModal } from '@/components/cart/AddressModal'
import { CartItemList } from '@/components/cart/CartItemList'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { formatPrice, canUseKakaoDeepLink } from '@/lib/utils/utils'
import { useIsMobile } from '@/lib/device/useDevice'
import { toggleWishlistDB } from '@/lib/wishlist/wishlist-db'
import { removeCartItemWithDB, updateCartQuantityWithDB } from '@/lib/cart/cart-db'
import { isSoldOut } from '@/lib/product/product-utils'
import { useDefaultAddress, useAddresses } from '@/lib/address/useAddress'
import { useCartRealtimeSync } from '@/lib/cart/useCartRealtimeSync'
import { validateCheckout, validateGiftCheckout, DeliveryMethod } from '@/lib/cart/checkout-validator'

function CartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const items = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const getTotalPrice = useCartStore((state) => state.getTotalPrice)
  const toggleSelect = useCartStore((state) => state.toggleSelect)
  const toggleSelectGroup = useCartStore((state) => state.toggleSelectGroup)
  const toggleSelectAll = useCartStore((state) => state.toggleSelectAll)
  const getSelectedItems = useCartStore((state) => state.getSelectedItems)
  
  const wishlistIds = useWishlistStore((state) => state.items)
  const { user } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('regular')
  const [pickupTime, setPickupTime] = useState('')
  const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
  const [quickDeliveryTime, setQuickDeliveryTime] = useState('')
  const [isKakaoGiftAvailable, setIsKakaoGiftAvailable] = useState(() => canUseKakaoDeepLink())
  const isMobile = useIsMobile()

  // hydration 에러 방지
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const updateAvailability = () => {
      setIsKakaoGiftAvailable(canUseKakaoDeepLink())
    }
    updateAvailability()

    window.addEventListener('focus', updateAvailability)
    document.addEventListener('visibilitychange', updateAvailability)

    return () => {
      window.removeEventListener('focus', updateAvailability)
      document.removeEventListener('visibilitychange', updateAvailability)
    }
  }, [])

  // productIds를 useMemo로 최적화하여 불필요한 재실행 방지
  // productId 목록만 추적 (selected 상태 변경은 무시)
  const productIds = useMemo(() => {
    return items.map(item => item.productId).filter(Boolean).sort()
  }, [items])
  const productIdsString = productIds.join(',')
  
  // 실시간 동기화 Hook
  useCartRealtimeSync(user?.id, productIdsString)

  // ✅ 공통 hook 사용
  const { address: defaultAddress, loading: loadingAddress, reload: reloadDefaultAddress } = useDefaultAddress(true)
  const { addresses: allAddresses, loading: loadingAddresses, reload: loadAllAddresses } = useAddresses()

  const allSelected = useMemo(() => 
    items.length > 0 && items.every((item) => item.selected !== false),
    [items]
  )

  // ✅ 배송지는 useDefaultAddress, useAddresses hook에서 자동 로드

  // 배송지 선택 (장바구니에서만 사용, 기본 배송지 변경 없음)
  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId)
  }
  
  // 배송지 선택 확인 - 기본 배송지로 저장
  const confirmAddressSelection = async () => {
    if (!selectedAddressId || !user) {
      setShowAddressModal(false)
      setSelectedAddressId(null)
      return
    }

    try {
      // 서버 API로 기본 배송지 설정
      const res = await fetch(`/api/addresses/${selectedAddressId}/default`, {
        method: 'PUT',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('기본 배송지 설정 실패:', res.status, errorData)
        toast.error('배송지 설정에 실패했습니다.')
        return
      }

      // 배송지 목록 새로고침 (hook에서 자동 업데이트)
      await Promise.all([
        loadAllAddresses(),
        reloadDefaultAddress()
      ])

      toast.success('기본 배송지가 변경되었습니다.')

    } catch (error) {
      console.error('배송지 업데이트 실패:', error)
      toast.error('배송지 설정에 실패했습니다.')
    } finally {
      setShowAddressModal(false)
      setSelectedAddressId(null)
    }
  }

  // 프로모션 삭제 감지는 이제 필요 없음 (DB에서 로드하므로)
  // DB에서 이미 삭제되었고, 장바구니 로드 시 자동으로 반영됨

  // 프로모션 그룹별로 상품 묶기 (품절 상품은 제외)
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof items } = {}
    const standalone: typeof items = []
    const soldOutItems: typeof items = []
    
    items.forEach(item => {
      // 품절 상품은 별도로 분리
      if (isSoldOut(item.status)) {
        soldOutItems.push(item)
        return
      }
      
      if (item.promotion_group_id) {
        if (!groups[item.promotion_group_id]) {
          groups[item.promotion_group_id] = []
        }
        groups[item.promotion_group_id].push(item)
      } else {
        standalone.push(item)
      }
    })
    
    return { groups, standalone, soldOutItems }
  }, [items])

  const ensureKakaoGiftAvailability = useCallback(() => {
    const available = canUseKakaoDeepLink()
    setIsKakaoGiftAvailable(available)

    if (!available) {
      toast.error('카카오톡 앱이 설치된 모바일 환경에서만 선물하기를 이용할 수 있어요.', {
        icon: '📱',
      })
    }
    return available
  }, [])

  const handleCheckout = useCallback(() => {
    const selectedItems = getSelectedItems()
    
    // 검증
    const validation = validateCheckout({
      selectedItems,
      deliveryMethod,
      pickupTime,
      quickDeliveryArea,
      quickDeliveryTime,
    })

    if (!validation.valid) {
      toast.error(validation.error || '주문 정보를 확인해주세요.', {
        icon: validation.errorIcon,
      })
      return
    }
    
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    // 배송 방법 및 관련 정보를 세션 스토리지에 저장
    sessionStorage.setItem('deliveryMethod', deliveryMethod)
    sessionStorage.setItem('pickupTime', pickupTime)
    sessionStorage.setItem('quickDeliveryArea', quickDeliveryArea)
    sessionStorage.setItem('quickDeliveryTime', quickDeliveryTime)
    router.push('/checkout')
  }, [getSelectedItems, user, router, deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime])

  const handleGiftCheckout = useCallback(() => {
    if (!ensureKakaoGiftAvailability()) {
      return
    }

    const selectedItems = getSelectedItems()
    
    // 검증
    const validation = validateGiftCheckout({
      selectedItems,
      deliveryMethod,
      pickupTime,
      quickDeliveryArea,
      quickDeliveryTime,
      isGift: true,
    })

    if (!validation.valid) {
      toast.error(validation.error || '주문 정보를 확인해주세요.', {
        icon: validation.errorIcon,
      })
      return
    }
    
    if (!user) {
      setShowLoginPrompt(true)
      return
    }
    
    // 배송 방법 및 관련 정보를 세션 스토리지에 저장
    sessionStorage.setItem('deliveryMethod', deliveryMethod)
    sessionStorage.setItem('pickupTime', pickupTime)
    sessionStorage.setItem('quickDeliveryArea', quickDeliveryArea)
    sessionStorage.setItem('quickDeliveryTime', quickDeliveryTime)
    router.push('/checkout?mode=gift')
  }, [ensureKakaoGiftAvailability, getSelectedItems, user, router, deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime])

  return (
    <div className="min-h-screen flex flex-col">
      <CartHeader />

      <main className="flex-1 container mx-auto px-2 pt-2 pb-0 md:pb-32">
        {/* 배송지 정보 */}
        {!loadingAddress && user && items.length > 0 && (
          <div className="mb-3 bg-white rounded-lg px-3 py-2">
            {defaultAddress ? (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900">{defaultAddress.name}</h3>
                    {defaultAddress.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">기본</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {defaultAddress.address}
                    {defaultAddress.address_detail && ` ${defaultAddress.address_detail}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    loadAllAddresses()
                    setSelectedAddressId(defaultAddress.id)
                    setShowAddressModal(true)
                  }}
                  className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-blue-50 transition whitespace-nowrap"
                >
                  배송지 변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">등록된 배송지가 없습니다</p>
                <button
                  onClick={() => router.push('/profile/addresses')}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-600 rounded-md hover:bg-blue-50 transition"
                >
                  배송지 등록
                </button>
              </div>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-32 md:py-40">
            <p className="text-xl text-gray-600 mb-6">장바구니가 비어있습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 */}
            <div className="lg:col-span-2">
              <DeliveryMethodSelector
                deliveryMethod={deliveryMethod}
                onDeliveryMethodChange={setDeliveryMethod}
                pickupTime={pickupTime}
                onPickupTimeChange={setPickupTime}
                quickDeliveryArea={quickDeliveryArea}
                onQuickDeliveryAreaChange={setQuickDeliveryArea}
                quickDeliveryTime={quickDeliveryTime}
                onQuickDeliveryTimeChange={setQuickDeliveryTime}
              />

              {/* 전체 선택 체크박스 */}
              <div className="bg-white pt-4 pb-4 border-b border-gray-300">
                <div className="flex items-center pl-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-5 h-5 border-gray-300 focus:ring-red-600 accent-red-600"
                      style={{ accentColor: '#dc2626' }}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">전체선택</span>
                  </label>
                </div>
              </div>

              {/* 무료배송 진행률 바 - 전체선택 아래 (택배배송일 때만) */}
              {deliveryMethod === 'regular' && (
                <div className="py-3 pb-4 border-b border-gray-300">
                  <FreeShippingProgress 
                    totalPrice={getTotalPrice()} 
                    deliveryMethod={deliveryMethod}
                  />
                </div>
              )}

              <CartItemList
                groupedItems={groupedItems}
                userId={user?.id}
                onToggleSelect={toggleSelect}
                onToggleSelectGroup={toggleSelectGroup}
                onRemoveItem={removeCartItemWithDB}
                onUpdateQuantity={updateCartQuantityWithDB}
              />
              
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <OrderSummary
                selectedItems={getSelectedItems()}
                deliveryMethod={deliveryMethod}
                pickupTime={pickupTime}
                quickDeliveryArea={quickDeliveryArea}
                quickDeliveryTime={quickDeliveryTime}
              />
            </div>
          </div>
        )}
      </main>

      {/* 하단 고정 액션 바: 선물하기 (모바일만) / 주문하기 */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white shadow-lg px-0 pb-0 flex gap-0">
          {deliveryMethod === 'regular' && isMobile && (
            <button
              type="button"
              onClick={handleGiftCheckout}
              disabled={!isKakaoGiftAvailable}
              className={`bg-gray-900 text-white py-3 text-base font-medium flex items-center justify-center gap-1 ${
                isKakaoGiftAvailable ? 'hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ width: '35%' }}
              title={
                isKakaoGiftAvailable
                  ? undefined
                  : '카카오톡 앱이 설치된 모바일 환경에서만 선물하기를 이용할 수 있어요.'
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span>선물하기</span>
            </button>
          )}
          <button
            onClick={handleCheckout}
            className={`bg-red-600 text-white py-3 text-base font-medium hover:bg-red-600 ${deliveryMethod === 'regular' && isMobile ? '' : 'w-full'}`}
            style={{ width: deliveryMethod === 'regular' && isMobile ? '65%' : '100%' }}
            suppressHydrationWarning
          >
            주문하기 ({mounted ? getSelectedItems().filter(item => !isSoldOut(item.status)).reduce((total, item) => total + item.quantity, 0) : 0})
          </button>
          </div>
        </div>
      </div>

      {/* 전역 프로모션 모달 */}
      <PromotionModalWrapper />

      <AddressModal
        show={showAddressModal}
        onClose={() => {
          setShowAddressModal(false)
          setSelectedAddressId(null)
        }}
        addresses={allAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={handleSelectAddress}
        onConfirm={confirmAddressSelection}
        loading={loadingAddresses}
      />

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

      <Footer />
      {/* 장바구니 페이지에서는 하단 액션 바가 있으므로 BottomNavbar 숨김 */}
      {pathname !== '/cart' && <BottomNavbar />}
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  )
}

