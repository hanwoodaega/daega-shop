'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { formatPrice, canUseKakaoDeepLink } from '@/lib/utils/utils'
import { useIsMobile } from '@/lib/device/useDevice'
import { useDefaultAddress, useAddresses } from '@/lib/address/useAddress'
import { useCartRealtimeSync } from '@/lib/cart/useCartRealtimeSync'
import { validateCheckout, validateGiftCheckout, DeliveryMethod } from '@/lib/cart/checkout-validator'
import { isSoldOut } from '@/lib/product/product-utils'
import { removeCartItemWithDB, updateCartQuantityWithDB } from '@/lib/cart/cart-db'

export function useCartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // Cart store
  const items = useCartStore((state) => state.items)
  const getTotalPrice = useCartStore((state) => state.getTotalPrice)
  const toggleSelect = useCartStore((state) => state.toggleSelect)
  const toggleSelectGroup = useCartStore((state) => state.toggleSelectGroup)
  const toggleSelectAll = useCartStore((state) => state.toggleSelectAll)
  const getSelectedItems = useCartStore((state) => state.getSelectedItems)

  // State
  const [mounted, setMounted] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('regular')
  const [pickupTime, setPickupTime] = useState('')
  const [quickDeliveryArea, setQuickDeliveryArea] = useState('')
  const [quickDeliveryTime, setQuickDeliveryTime] = useState('')
  const [isKakaoGiftAvailable, setIsKakaoGiftAvailable] = useState(() => canUseKakaoDeepLink())

  // Hooks
  const { address: defaultAddress, loading: loadingAddress, reload: reloadDefaultAddress } = useDefaultAddress(true)
  const { addresses: allAddresses, loading: loadingAddresses, reload: loadAllAddresses } = useAddresses()

  // Hydration 에러 방지
  useEffect(() => {
    setMounted(true)
  }, [])

  // 카카오톡 선물하기 가능 여부 체크
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

  // 실시간 동기화
  const productIds = useMemo(() => {
    return items.map(item => item.productId).filter(Boolean).sort()
  }, [items])
  const productIdsString = productIds.join(',')
  useCartRealtimeSync(user?.id, productIdsString)

  // Computed values
  const allSelected = useMemo(() => 
    items.length > 0 && items.every((item) => item.selected !== false),
    [items]
  )

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof items } = {}
    const standalone: typeof items = []
    const soldOutItems: typeof items = []
    
    items.forEach(item => {
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

  // Handlers
  const handleSelectAddress = useCallback((addressId: string) => {
    setSelectedAddressId(addressId)
  }, [])

  const confirmAddressSelection = useCallback(async () => {
    if (!selectedAddressId || !user) {
      setShowAddressModal(false)
      setSelectedAddressId(null)
      return
    }

    try {
      const res = await fetch(`/api/addresses/${selectedAddressId}/default`, {
        method: 'PUT',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('기본 배송지 설정 실패:', res.status, errorData)
        toast.error('배송지 설정에 실패했습니다.')
        return
      }

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
  }, [selectedAddressId, user, loadAllAddresses, reloadDefaultAddress])

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
    
    sessionStorage.setItem('deliveryMethod', deliveryMethod)
    sessionStorage.setItem('pickupTime', pickupTime)
    sessionStorage.setItem('quickDeliveryArea', quickDeliveryArea)
    sessionStorage.setItem('quickDeliveryTime', quickDeliveryTime)
    router.push('/checkout?mode=gift')
  }, [ensureKakaoGiftAvailability, getSelectedItems, user, router, deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime])

  const openAddressModal = useCallback(() => {
    loadAllAddresses()
    setSelectedAddressId(defaultAddress?.id || null)
    setShowAddressModal(true)
  }, [defaultAddress?.id, loadAllAddresses])

  return {
    // State
    mounted,
    items,
    user,
    isMobile,
    allSelected,
    groupedItems,
    showLoginPrompt,
    showAddressModal,
    selectedAddressId,
    deliveryMethod,
    pickupTime,
    quickDeliveryArea,
    quickDeliveryTime,
    isKakaoGiftAvailable,
    defaultAddress,
    loadingAddress,
    allAddresses,
    loadingAddresses,
    // Computed
    getTotalPrice,
    getSelectedItems,
    // Handlers
    toggleSelect,
    toggleSelectGroup,
    toggleSelectAll,
    setDeliveryMethod,
    setPickupTime,
    setQuickDeliveryArea,
    setQuickDeliveryTime,
    setShowLoginPrompt,
    setShowAddressModal,
    setSelectedAddressId,
    handleSelectAddress,
    confirmAddressSelection,
    handleCheckout,
    handleGiftCheckout,
    openAddressModal,
    removeCartItemWithDB,
    updateCartQuantityWithDB,
  }
}

