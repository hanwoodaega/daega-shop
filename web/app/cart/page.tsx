'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
// Navbar 제거: 장바구니 전용 헤더 사용
import ProductCard from '@/components/ProductCard'
import BottomNavbar from '@/components/BottomNavbar'
import FreeShippingProgress from '@/components/FreeShippingProgress'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { formatPrice } from '@/lib/utils'
import { supabase, Product } from '@/lib/supabase'
import { toggleWishlistDB } from '@/lib/wishlist-db'
import { removeCartItemWithDB, updateCartQuantityWithDB, addCartItemWithDB, loadCartFromDB, clearCartWithDB } from '@/lib/cart-db'
import { calculateDiscountPrice } from '@/lib/product-utils'
import { useDefaultAddress, useAddresses } from '@/lib/hooks/useAddress'
import { PICKUP_TIME_SLOTS, QUICK_DELIVERY_AREAS, QUICK_DELIVERY_TIME_SLOTS, GIFT_MIN_AMOUNT } from '@/lib/constants'
import { calculateOrderTotal } from '@/lib/order-calc'

function CartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'quick' | 'regular'>('regular')
  const [pickupTime, setPickupTime] = useState('')
  const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
  const [quickDeliveryTime, setQuickDeliveryTime] = useState('')

  // hydration 에러 방지
  useEffect(() => {
    setMounted(true)
  }, [])

  // 로그인 사용자 - DB에서 장바구니 로드 및 실시간 가격 갱신
  const channelRef = useRef<any>(null)
  
  // productIds를 useMemo로 최적화하여 불필요한 재실행 방지
  // productId 목록만 추적 (selected 상태 변경은 무시)
  const productIds = useMemo(() => {
    return items.map(item => item.productId).filter(Boolean).sort()
  }, [items])
  const productIdsString = productIds.join(',')
  
  useEffect(() => {
    if (!user?.id) return

    const loadCart = async () => {
      const dbItems = await loadCartFromDB(user.id)
      useCartStore.setState({ items: dbItems })
    }
    
    // 초기 로드
    loadCart()
    
    // 페이지 포커스 시 갱신 (다른 탭에서 돌아올 때)
    const handleFocus = () => {
      loadCart()
    }
    window.addEventListener('focus', handleFocus)
    
    // Supabase Realtime 구독: 상품 가격/할인율 변경 시 장바구니 갱신
    // 최신 items를 스토어에서 가져오기 (클로저 문제 방지)
    const currentItems = useCartStore.getState().items
    const productIds = currentItems.map(item => item.productId).filter(Boolean)
    
    // 기존 channel이 있으면 먼저 제거 (중복 구독 방지)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    
    if (productIds.length > 0) {
      const channelName = `product-price-changes-${user.id}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'products',
            filter: `id=in.(${productIds.join(',')})`
          },
          (payload: any) => {
            // 상품 가격이나 할인율이 변경되면 장바구니 갱신
            if (payload.new.price !== payload.old?.price || 
                payload.new.discount_percent !== payload.old?.discount_percent) {
              loadCart()
            }
          }
        )
        .subscribe()
      
      channelRef.current = channel
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      // cleanup: 기존 channel 제거
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, productIdsString])

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
      // 1. 모든 배송지의 is_default를 false로 설정
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // 2. 선택한 배송지를 기본 배송지로 설정
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', selectedAddressId)
        .eq('user_id', user.id)

      if (error) {
        console.error('기본 배송지 설정 실패:', error)
        toast.error('배송지 설정에 실패했습니다.')
        return
      }

      // 3. 배송지 목록 새로고침 (hook에서 자동 업데이트)
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

  // 프로모션 그룹별로 상품 묶기
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof items } = {}
    const standalone: typeof items = []
    
    items.forEach(item => {
      if (item.promotion_group_id) {
        if (!groups[item.promotion_group_id]) {
          groups[item.promotion_group_id] = []
        }
        groups[item.promotion_group_id].push(item)
      } else {
        standalone.push(item)
      }
    })
    
    return { groups, standalone }
  }, [items])

  const handleCheckout = useCallback(() => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
      toast.error('주문할 상품을 선택해주세요.', {
        icon: '📦',
      })
      return
    }
    
    // 배송 방법별 필수 입력 검증
    if (deliveryMethod === 'pickup' && !pickupTime) {
      toast.error('픽업 시간을 선택해주세요.', { icon: '⏰' })
      return
    }
    if (deliveryMethod === 'quick' && (!quickDeliveryArea || !quickDeliveryTime)) {
      toast.error('배달 지역과 시간대를 선택해주세요.', { icon: '🚚' })
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
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
      toast.error('주문할 상품을 선택해주세요.', {
        icon: '🎁',
      })
      return
    }
    
    // 선물하기는 상품금액(즉시할인 적용 후)이 최소 금액 이상이어야 함 (배송비 제외)
    const { discountedTotal } = calculateOrderTotal(selectedItems, deliveryMethod)
    if (discountedTotal < GIFT_MIN_AMOUNT) {
      toast.error(`선물하기는 상품금액(할인 적용 후)이 ${formatPrice(GIFT_MIN_AMOUNT)}원 이상이어야 합니다.`, { icon: '🎁' })
      return
    }
    
    // 배송 방법별 필수 입력 검증
    if (deliveryMethod === 'pickup' && !pickupTime) {
      toast.error('픽업 시간을 선택해주세요.', { icon: '⏰' })
      return
    }
    if (deliveryMethod === 'quick' && (!quickDeliveryArea || !quickDeliveryTime)) {
      toast.error('배달 지역과 시간대를 선택해주세요.', { icon: '🚚' })
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
  }, [getSelectedItems, user, router, deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 장바구니 전용 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              장바구니
            </h1>
          </div>
          
          {/* 오른쪽: 찜 버튼 + 홈 버튼 */}
          <div className="ml-auto flex items-center gap-0">
            <button
              onClick={() => router.push('/wishlist')}
              aria-label="찜 목록"
              className="p-2 text-blue-900 hover:text-blue-800"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <button
              onClick={() => router.push('/')}
              aria-label="홈으로"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

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
                  className="ml-4 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition whitespace-nowrap"
                >
                  배송지 변경
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">등록된 배송지가 없습니다</p>
                <button
                  onClick={() => router.push('/profile/addresses')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-800 rounded-md hover:bg-primary-900 transition"
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
              className="bg-white text-blue-900 border border-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 */}
            <div className="lg:col-span-2">
              {/* 배송 방법 선택 */}
              <div className="mb-2 bg-white rounded-lg border border-gray-200 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setDeliveryMethod('regular')}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                      deliveryMethod === 'regular'
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    택배배송
                  </button>
                  <button
                    onClick={() => setDeliveryMethod('quick')}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                      deliveryMethod === 'quick'
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    퀵배송
                  </button>
                  <button
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                      deliveryMethod === 'pickup'
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    오늘픽업
                  </button>
                </div>

                {/* 퀵배송 선택 시 - 지역과 시간대 (양옆으로) */}
                {deliveryMethod === 'quick' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <select
                      value={quickDeliveryArea}
                      onChange={(e) => setQuickDeliveryArea(e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    >
                      <option value="">지역 선택</option>
                      {QUICK_DELIVERY_AREAS.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    <select
                      value={quickDeliveryTime}
                      onChange={(e) => setQuickDeliveryTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    >
                      <option value="">시간대 선택</option>
                      {QUICK_DELIVERY_TIME_SLOTS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 픽업 선택 시 - 시간대 */}
                {deliveryMethod === 'pickup' && (
                  <div className="mt-3">
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    >
                      <option value="">시간 선택</option>
                      {PICKUP_TIME_SLOTS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 전체 선택 체크박스 및 장바구니 비우기 */}
              <div className={`bg-white pt-4 pb-4 ${deliveryMethod === 'regular' ? 'border-b border-gray-300' : ''}`}>
                <div className="flex items-center justify-between pl-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-5 h-5 border-gray-300 focus:ring-blue-900 accent-blue-900"
                      style={{ accentColor: '#1e3a8a' }}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">전체선택</span>
                  </label>
                  <button
                    onClick={async () => {
                      if (!confirm('장바구니를 모두 비우시겠습니까?')) return
                      await clearCartWithDB(user?.id || null)
                    }}
                    className="text-xs text-gray-600 hover:text-red-600 px-2 py-1"
                  >
                    장바구니 비우기
                  </button>
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

              {/* 프로모션 그룹 표시 */}
              {Object.entries(groupedItems.groups).map(([groupId, groupItems]) => {
                const groupSelected = groupItems.every(item => item.selected !== false)
                return (
                  <div key={groupId} className="py-3 border-b border-gray-300">
                    {/* 프로모션 그룹 헤더 - 체크박스와 삭제 버튼 */}
                    <div className="mb-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={groupSelected}
                          onChange={() => toggleSelectGroup(groupId)}
                          className="w-5 h-5 border-gray-300 focus:ring-blue-900 accent-blue-900"
                          style={{ accentColor: '#1e3a8a' }}
                        />
                        <span className="text-base font-medium text-gray-900">
                          {groupItems[0].promotion_type || '2+1'} 적용
                        </span>
                      </div>
                      <button
                        onClick={() => removeCartItemWithDB(user?.id || null, groupItems[0].id!, groupItems[0].promotion_group_id)}
                        className="text-gray-700 hover:text-gray-900 p-1"
                        aria-label="삭제"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  
                  {/* 그룹 내 상품들 */}
                  {groupItems.map((item, itemIndex) => {
                    return (
                    <div key={item.id} className={`${itemIndex === 0 ? 'pt-1' : 'pt-3'} pb-3 ${itemIndex < groupItems.length - 1 ? 'border-dashed-long' : ''}`}>
                      <div className="flex items-start space-x-3">
                        {/* 상품 이미지 */}
                        <Link href={`/products/${item.productId}`} className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-xs hover:opacity-80 transition">
                          이미지 준비중
                        </Link>

                        {/* 상품 정보 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <Link href={`/products/${item.productId}`} className="flex-1 pr-2 hover:opacity-80 transition">
                              {item.brand && (
                                <div className="text-sm font-bold text-gray-900 mb-0.5">{item.brand}</div>
                              )}
                              <h3 className="text-sm font-normal mb-1">{item.name}</h3>
                            </Link>
                          </div>

                          <div className="flex-1">
                            {item.discount_percent === 100 ? (
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-500 line-through">
                                  {formatPrice(item.price)}원
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                  0원
                                </div>
                              </div>
                            ) : (
                              <div className="text-lg font-bold text-gray-900">
                                {formatPrice(item.price)}원
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                  
                  {/* 그룹 수량 조절 - 하단에 배치 */}
                  <div className="mt-0.5 flex items-center justify-end">
                    <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                      <button
                        onClick={() => {
                          const currentQty = groupItems[0].quantity
                          const newQty = Math.max(1, currentQty - 1)
                          groupItems.forEach(item => {
                            updateCartQuantityWithDB(user?.id || null, item.id!, newQty)
                          })
                        }}
                        className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
                      >
                        <span className="text-xl leading-none -mt-0.5">-</span>
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {groupItems[0].quantity}
                      </span>
                      <button
                        onClick={() => {
                          const currentQty = groupItems[0].quantity
                          const newQty = currentQty + 1
                          groupItems.forEach(item => {
                            updateCartQuantityWithDB(user?.id || null, item.id!, newQty)
                          })
                        }}
                        className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
                      >
                        <span className="text-xl leading-none -mt-0.5">+</span>
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}

              {/* 일반 상품 표시 */}
              {groupedItems.standalone.map((item, index) => (
                <div key={item.id} className={`py-6 ${index < groupedItems.standalone.length - 1 || Object.keys(groupedItems.groups).length > 0 ? 'border-b border-gray-300' : ''}`}>
                  <div className="flex items-start space-x-3">
                    {/* 상품 이미지 (각진 모서리, 크기 약간 축소) */}
                    <div className="relative w-24 h-24 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      {/* 체크박스 - 이미지 왼쪽 상단 */}
                      <div 
                        className="absolute top-0 left-0 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected !== false}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelect(item.id!)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 border-gray-300 focus:ring-blue-900 bg-white accent-blue-900 cursor-pointer"
                          style={{ accentColor: '#1e3a8a' }}
                        />
                      </div>
                      <Link href={`/products/${item.productId}`} className="absolute inset-0 flex items-center justify-center hover:opacity-80 transition">
                        <span className="text-gray-500 text-xs">이미지 준비중</span>
                      </Link>
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <Link href={`/products/${item.productId}`} className="flex-1 pr-2 hover:opacity-80 transition">
                          {item.brand && (
                            <div className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1">{item.brand}</div>
                          )}
                          <h3 className="text-sm font-normal mb-1 line-clamp-2">{item.name}</h3>
                        </Link>
                        <button
                          onClick={() => removeCartItemWithDB(user?.id || null, item.id!)}
                          className="text-gray-700 hover:text-gray-900 p-1 flex-shrink-0"
                          aria-label="삭제"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {item.discount_percent && item.discount_percent > 0 ? (
                            <>
                              <div className="text-xs text-gray-500 line-through mt-1">
                                {formatPrice(item.price * item.quantity)}원
                              </div>
                              <div className="flex items-baseline gap-2 mt-0">
                                <span className="text-base md:text-lg font-bold text-red-600">{item.discount_percent}%</span>
                                <span className="text-lg md:text-xl font-extrabold text-gray-900">
                                  {formatPrice(Math.round(item.price * (100 - item.discount_percent) / 100) * item.quantity)}
                                </span>
                                <span className="text-gray-600 text-sm">원</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="invisible h-2 leading-none">.</div>
                              <div className="flex items-baseline gap-1 mt-0">
                                <span className="text-lg md:text-xl font-bold text-gray-900">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                                <span className="text-gray-600 text-sm">원</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                          <button
                            onClick={() => updateCartQuantityWithDB(user?.id || null, item.id!, Math.max(1, item.quantity - 1))}
                            className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-r border-gray-300"
                          >
                            <span className="text-xl leading-none -mt-0.5">-</span>
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantityWithDB(user?.id || null, item.id!, item.quantity + 1)}
                            className="w-7 h-6 hover:bg-gray-100 flex items-center justify-center border-l border-gray-300"
                          >
                            <span className="text-xl leading-none -mt-0.5">+</span>
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
              <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 sticky top-24 mb-40">
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

                <div className="border-t pt-4 space-y-3 mb-6">
                  {/* 주문 금액 계산 (통합 유틸리티 사용) */}
                  {(() => {
                    const selectedItems = getSelectedItems()
                    const { originalTotal, discountAmount, shipping, total } = calculateOrderTotal(selectedItems, deliveryMethod)
                    
                    return (
                      <>
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
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 고정 액션 바: 선물하기 / 주문하기 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <div className="px-0 pb-0 flex gap-0">
          {deliveryMethod === 'regular' && (
            <button
              onClick={handleGiftCheckout}
              className="bg-gray-900 text-white py-3 text-base font-medium hover:bg-gray-800 flex items-center justify-center gap-1"
              style={{ width: '35%' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span>선물하기</span>
            </button>
          )}
          <button
            onClick={handleCheckout}
            className={`bg-blue-900 text-white py-3 text-base font-medium hover:bg-blue-800 ${deliveryMethod === 'regular' ? '' : 'w-full'}`}
            style={{ width: deliveryMethod === 'regular' ? '65%' : '100%' }}
            suppressHydrationWarning
          >
            주문하기 ({mounted ? getSelectedItems().reduce((total, item) => total + item.quantity, 0) : 0})
          </button>
        </div>
      </div>

      {/* 전역 프로모션 모달 */}
      <PromotionModalWrapper />

      {/* 배송지 선택 모달 */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => {
            setShowAddressModal(false)
            setSelectedAddressId(null)
          }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-primary-800 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">배송지 선택</h3>
                <button onClick={() => {
                  setShowAddressModal(false)
                  setSelectedAddressId(null)
                }} className="text-white text-2xl">×</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAddresses ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
                </div>
              ) : allAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">등록된 배송지가 없습니다</p>
                  <button
                    onClick={() => {
                      setShowAddressModal(false)
                      router.push('/profile/addresses')
                    }}
                    className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900"
                  >
                    배송지 등록하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {allAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleSelectAddress(address.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedAddressId === address.id
                          ? 'border-primary-800 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">{address.name}</h4>
                        {address.is_default && (
                          <span className="text-xs bg-primary-800 text-white px-2 py-0.5 rounded">기본</span>
                        )}
                        {selectedAddressId === address.id && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">선택됨</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {address.address}
                        {address.address_detail && ` ${address.address_detail}`}
                      </p>
                      {address.recipient_phone && (
                        <p className="text-sm text-gray-600">
                          {address.recipient_name} · {address.recipient_phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t flex gap-2">
              <button
                onClick={() => {
                  setShowAddressModal(false)
                  setSelectedAddressId(null)
                  router.push('/profile/addresses')
                }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                배송지 관리
              </button>
              <button
                onClick={confirmAddressSelection}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-800 rounded-lg hover:bg-primary-900"
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

