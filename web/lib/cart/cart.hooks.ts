import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { formatPrice } from '@/lib/utils/utils'
import { useIsMobile } from '@/lib/device/useDevice'
import { useDefaultAddress, useAddresses } from '@/lib/address/useAddress'
import { useCartRealtimeSync } from '@/lib/cart/useCartRealtimeSync'
import { validateCheckout } from '@/lib/cart/checkout-validator'
import { isSoldOut } from '@/lib/product/product-utils'
import { removeCartItemWithDB, updateCartQuantityWithDB } from '@/lib/cart/cart-db'
import { DeliveryMethod } from './cart.types'

export function useCart() {
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

  // Hooks
  const { address: defaultAddress, loading: loadingAddress, reload: reloadDefaultAddress } = useDefaultAddress(true)
  const { addresses: allAddresses, loading: loadingAddresses, reload: loadAllAddresses } = useAddresses()

  // Hydration guard
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dm = sessionStorage.getItem('deliveryMethod')
    if (dm === 'quick') {
      sessionStorage.setItem('deliveryMethod', 'regular')
      setDeliveryMethod('regular')
    }
  }, [])

  // Realtime sync
  const productIds = useMemo(() => items.map(item => item.productId).filter(Boolean).sort(), [items])
  const productIdsString = productIds.join(',')
  useCartRealtimeSync(user?.id, productIdsString)

  // Computed
  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => item.selected !== false),
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
        toast.error('배송지 설정에 실패했습니다.', { duration: 3000 })
        return
      }

      await Promise.all([
        loadAllAddresses(),
        reloadDefaultAddress()
      ])

      toast.success('기본 배송지가 변경되었습니다.', { duration: 2000 })
    } catch (error) {
      console.error('배송지 업데이트 실패:', error)
      toast.error('배송지 설정에 실패했습니다.', { duration: 3000 })
    } finally {
      setShowAddressModal(false)
      setSelectedAddressId(null)
    }
  }, [selectedAddressId, user, loadAllAddresses, reloadDefaultAddress])

  const handleCheckout = useCallback(() => {
    const selectedItems = getSelectedItems()

    const validation = validateCheckout({
      selectedItems,
      deliveryMethod,
      pickupTime,
    })

    if (!validation.valid) {
      toast.error(validation.error || '주문 정보를 확인해주세요.', { duration: 3000 })
      return
    }

    if (!user) {
      setShowLoginPrompt(true)
      return
    }

    goToCheckout()
  }, [getSelectedItems, user, deliveryMethod, pickupTime])

  const goToCheckout = useCallback(() => {
    sessionStorage.setItem('deliveryMethod', deliveryMethod)
    sessionStorage.setItem('pickupTime', pickupTime)
    router.push('/checkout')
  }, [router, deliveryMethod, pickupTime])

  const handleGuestCheckout = useCallback((_serverDiscountedTotal?: number) => {
    const selectedItems = getSelectedItems()

    const validation = validateCheckout({
      selectedItems,
      deliveryMethod,
      pickupTime,
    })

    if (!validation.valid) {
      toast.error(validation.error || '주문 정보를 확인해주세요.', { duration: 3000 })
      return
    }

    goToCheckout()
  }, [getSelectedItems, deliveryMethod, pickupTime, goToCheckout])

  const openAddressModal = useCallback(() => {
    loadAllAddresses()
    setSelectedAddressId(defaultAddress?.id || null)
    setShowAddressModal(true)
  }, [defaultAddress?.id, loadAllAddresses])

  const closeLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false)
  }, [])

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
    setShowLoginPrompt,
    setShowAddressModal,
    setSelectedAddressId,
    closeLoginPrompt,
    handleSelectAddress,
    confirmAddressSelection,
    handleCheckout,
    handleGuestCheckout,
    openAddressModal,
    removeCartItemWithDB,
    updateCartQuantityWithDB,
    // Utils
    formatPrice,
  }
}


