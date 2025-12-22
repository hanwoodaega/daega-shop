'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { useDefaultAddress, useUserProfile } from '@/lib/address/useAddress'
import { openDaumPostcode, AddressSearchResult } from '@/lib/postcode/useDaumPostcode'
import { calculateOrderTotal } from '@/lib/order/order-calc'
import { SHIPPING, GIFT_MIN_AMOUNT } from '@/lib/utils/constants'
import { getUserCoupons, isCouponValid } from '@/lib/coupon/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { removeFromCartDB } from '@/lib/cart/cart-db'
import { shareGiftToKakao } from '@/lib/gift/kakaoShare'
import { initKakaoSDK } from '@/lib/gift/initKakao'
import { showError, showSuccess, showInfo } from '@/lib/utils/error-handler'
import { formatPrice } from '@/lib/utils/utils'

interface DeliveryState {
  method: 'pickup' | 'quick' | 'regular'
  pickupTime: string
  quickDeliveryArea: string
  quickDeliveryTime: string
}

interface FormData {
  name: string
  phone: string
  email: string
  address: string
  addressDetail: string
  zipcode: string
  message: string
}

interface Flags {
  isProcessing: boolean
  mounted: boolean
  saveAsDefaultAddress: boolean
  isEditingOrderer: boolean
}

interface GiftData {
  message: string
  cardDesign: string
  withMessage: boolean
}

interface UseCheckoutControllerOptions {
  isGiftMode: boolean
}

interface UseCheckoutControllerReturn {
  // State
  state: {
    deliveryState: DeliveryState
    formData: FormData
    flags: Flags
    availableCoupons: UserCoupon[]
    selectedCoupon: UserCoupon | null
    showCouponModal: boolean
    loadingCoupons: boolean
    userPoints: number
    usedPoints: number
    loadingPoints: boolean
    usedPointsInput: string
    paymentMethod: string
    selectedCardId: string | null
    savedCards: any[]
    loadingCards: boolean
    giftData: GiftData
    currentStep: number
    items: any[]
    isDirectPurchase: boolean
  }
  // Actions
  actions: {
    setDeliveryState: React.Dispatch<React.SetStateAction<DeliveryState>>
    setFormData: React.Dispatch<React.SetStateAction<FormData>>
    setFlags: React.Dispatch<React.SetStateAction<Flags>>
    setSelectedCoupon: (coupon: UserCoupon | null) => void
    setShowCouponModal: (show: boolean) => void
    setUsedPoints: (points: number) => void
    setUsedPointsInput: (input: string) => void
    setPaymentMethod: (method: string) => void
    setSelectedCardId: (cardId: string | null) => void
    setGiftData: React.Dispatch<React.SetStateAction<GiftData>>
    setCurrentStep: (step: number) => void
    handleSubmit: (e: React.FormEvent) => Promise<void>
    handleNextStep: (e?: React.MouseEvent) => void
    handleSearchAddress: () => void
    loadAvailableCoupons: () => Promise<void>
    loadUserPoints: () => Promise<void>
    loadSavedCards: () => Promise<void>
    applyAddress: (address: any) => void
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  }
  // Derived
  derived: {
    deliveryMethod: 'pickup' | 'quick' | 'regular'
    pickupTime: string
    quickDeliveryArea: string
    quickDeliveryTime: string
    isProcessing: boolean
    mounted: boolean
    saveAsDefaultAddress: boolean
    isEditingOrderer: boolean
    isGiftFinalStep: boolean
    gridColumnsClass: string
    originalTotal: number
    discountAmount: number
    shipping: number
    discountedTotal: number
    orderTotal: number
    subtotal: number
    couponDiscount: number
    afterCouponDiscount: number
    finalTotal: number
    pickupTimeSlots: string[]
    quickDeliveryAreas: string[]
    quickDeliveryTimeSlots: string[]
    defaultAddress: any
    loadingDefaultAddress: boolean
    hasDefaultAddress: boolean
    userProfile: any
    loadingUserProfile: boolean
  }
}

const TOTAL_GIFT_STEPS = 3

export function useCheckoutController(options: UseCheckoutControllerOptions): UseCheckoutControllerReturn {
  const { isGiftMode } = options
  const router = useRouter()
  const { user } = useAuth()
  const timeoutsRef = useRef<number[]>([])

  // Cart & Direct Purchase
  const cartItems = useCartStore((state) => state.items)
  const getCartTotalPrice = useCartStore((state) => state.getTotalPrice)
  const removeSelectedFromCart = useCartStore((state) => state.removeSelectedItems)
  const getSelectedItems = useCartStore((state) => state.getSelectedItems)
  
  const directPurchaseItems = useDirectPurchaseStore((state) => state.items)
  const getDirectPurchaseTotalPrice = useDirectPurchaseStore((state) => state.getTotalPrice)
  const clearDirectPurchase = useDirectPurchaseStore((state) => state.clearItems)
  
  const isDirectPurchase = directPurchaseItems.length > 0
  const items = isDirectPurchase ? directPurchaseItems : getSelectedItems()
  const getTotalPrice = isDirectPurchase ? getDirectPurchaseTotalPrice : getCartTotalPrice

  // State
  const [deliveryState, setDeliveryState] = useState<DeliveryState>({
    method: 'regular',
    pickupTime: '',
    quickDeliveryArea: '',
    quickDeliveryTime: '',
  })

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    addressDetail: '',
    zipcode: '',
    message: '',
  })

  const [flags, setFlags] = useState<Flags>({
    isProcessing: false,
    mounted: false,
    saveAsDefaultAddress: false,
    isEditingOrderer: false,
  })

  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  const [userPoints, setUserPoints] = useState(0)
  const [usedPoints, setUsedPoints] = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [usedPointsInput, setUsedPointsInput] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<any[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  const [giftData, setGiftData] = useState<GiftData>({
    message: '',
    cardDesign: 'birthday-1',
    withMessage: true,
  })

  const [currentStep, setCurrentStep] = useState(1)

  // Hooks
  const { address: defaultAddress, loading: loadingDefaultAddress, hasDefaultAddress } = useDefaultAddress()
  const { profile: userProfile, loading: loadingUserProfile } = useUserProfile()

  // Derived values
  const { method: deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime } = deliveryState
  const { isProcessing, mounted, saveAsDefaultAddress, isEditingOrderer } = flags
  const isGiftFinalStep = !isGiftMode || currentStep === TOTAL_GIFT_STEPS
  const gridColumnsClass = isGiftFinalStep ? 'lg:grid-cols-3' : 'lg:grid-cols-1'

  // Order calculations
  const { originalTotal, discountAmount, shipping, discountedTotal, total: orderTotal } = calculateOrderTotal(items, deliveryMethod)
  const subtotal = discountedTotal
  
  const calculateCouponDiscount = useCallback((subtotal: number): number => {
    if (!selectedCoupon || !selectedCoupon.coupon) return 0

    const coupon = selectedCoupon.coupon as Coupon
    
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
  }, [selectedCoupon])

  const couponDiscount = calculateCouponDiscount(subtotal)
  const afterCouponDiscount = Math.max(0, subtotal - couponDiscount)
  const finalTotal = Math.max(0, afterCouponDiscount - usedPoints)

  // Memoized values
  const pickupTimeSlots = useMemo(() => [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00'
  ], [])

  const quickDeliveryAreas = useMemo(() => [
    '연향동', '조례동', '풍덕동', '해룡면'
  ], [])

  const quickDeliveryTimeSlots = useMemo(() => [
    '10:00~11:00', '11:00~12:00', '12:00~13:00',
    '13:00~14:00', '14:00~15:00', '15:00~16:00',
    '16:00~17:00', '17:00~18:00', '18:00~19:00',
    '19:00~20:00', '20:00~21:00', '21:00~22:00'
  ], [])

  // Effects
  // 초기화 로직을 하나로 묶기
  const restoreDeliveryFromSession = useCallback(() => {
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
  }, [setDeliveryState])

  const initOnMount = useCallback(() => {
    // 1. 카카오 SDK 초기화
    initKakaoSDK()
    
    // 2. 세션 스토리지에서 배송 방법 복원
    restoreDeliveryFromSession()
    
    // 3. 마운트 상태 설정
    setFlags(prev => ({ ...prev, mounted: true }))
    
    // 4. 선물 모드일 때 첫 단계로 설정
    if (isGiftMode) {
      setCurrentStep(1)
    }
  }, [isGiftMode, restoreDeliveryFromSession, setFlags, setCurrentStep])

  useEffect(() => {
    initOnMount()
  }, [initOnMount])

  useEffect(() => {
    if (defaultAddress) {
      applyAddress(defaultAddress)
    } else if (!hasDefaultAddress) {
      setFlags(prev => ({ ...prev, saveAsDefaultAddress: true }))
    }
  }, [defaultAddress, hasDefaultAddress])

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

  useEffect(() => {
    if (user?.id) {
      loadAvailableCoupons()
      loadUserPoints()
      loadSavedCards()
    }
  }, [user?.id])

  useEffect(() => {
    setUsedPointsInput(usedPoints ? String(usedPoints) : '')
  }, [usedPoints])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

  // Actions
  const loadSavedCards = useCallback(async () => {
    if (!user?.id) return

    setLoadingCards(true)
    try {
      const res = await fetch('/api/payment-cards')
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('결제 카드 조회 실패:', res.status, errorData)
        setSavedCards([])
        return
      }

      const data = await res.json()
      setSavedCards(data.cards || [])
      
      const defaultCard = data.cards?.find((card: any) => card.is_default)
      if (defaultCard) {
        setSelectedCardId(defaultCard.id)
      }
    } catch (error) {
      console.error('카드 조회 실패:', error)
      setSavedCards([])
    } finally {
      setLoadingCards(false)
    }
  }, [user?.id])

  const loadUserPoints = useCallback(async () => {
    if (!user?.id) return

    setLoadingPoints(true)
    try {
      const res = await fetch('/api/points')
      if (!res.ok) {
        throw new Error('포인트 조회 실패')
      }
      const data = await res.json()
      setUserPoints(data.userPoints?.total_points || 0)
    } catch (error) {
      console.error('포인트 조회 실패:', error)
    } finally {
      setLoadingPoints(false)
    }
  }, [user?.id])

  const loadAvailableCoupons = useCallback(async () => {
    if (!user?.id) return

    setLoadingCoupons(true)
    try {
      const coupons = await getUserCoupons(false)
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
  }, [user?.id])

  const applyAddress = useCallback((address: {
    recipient_name?: string | null
    recipient_phone?: string | null
    zipcode?: string | null
    address?: string | null
    address_detail?: string | null
    delivery_note?: string | null
  }) => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || address.recipient_name || '',
      phone: prev.phone || address.recipient_phone || '',
      zipcode: address.zipcode || '',
      address: address.address || '',
      addressDetail: address.address_detail || '',
      message: address.delivery_note || '',
    }))
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleNextStep = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!isGiftMode || currentStep >= TOTAL_GIFT_STEPS) return

    const expectedAmount = finalTotal + shipping
    
    if (expectedAmount < GIFT_MIN_AMOUNT) {
      toast.error(`선물하기는 결제 금액이 ${formatPrice(GIFT_MIN_AMOUNT)}원 이상이어야 합니다.`, { icon: '🎁' })
      return
    }

    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.phone.trim()) {
        toast.error('보내는 분 정보를 입력해주세요.', { icon: '⚠️' })
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, TOTAL_GIFT_STEPS))
  }, [isGiftMode, currentStep, finalTotal, shipping, formData.name, formData.phone])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // 내부 함수: 검증
    const validateBeforeSubmit = (): boolean => {
      if (items.length === 0) {
        showError({ message: '주문할 상품이 없습니다.' }, { icon: '📦' })
        router.push(isDirectPurchase ? '/products' : '/cart')
        return false
      }

      if (isGiftMode && currentStep < TOTAL_GIFT_STEPS) {
        showInfo('다음 단계를 진행해주세요.', { icon: '➡️' })
        return false
      }

      if (!isGiftMode) {
        if (!formData.name || !formData.phone) {
          showError({ message: '필수 항목을 모두 입력해주세요.' }, { icon: '⚠️' })
          return false
        }

        if (deliveryMethod === 'pickup' && !pickupTime) {
          showError({ message: '픽업 시간을 선택해주세요.' }, { icon: '⏰' })
          return false
        }

        if (deliveryMethod === 'quick') {
          if (!quickDeliveryArea) {
            showError({ message: '배달 지역을 선택해주세요.' }, { icon: '📍' })
            return false
          }
          if (!formData.address) {
            showError({ message: '상세 주소를 입력해주세요.' }, { icon: '📍' })
            return false
          }
          if (!quickDeliveryTime) {
            showError({ message: '배달 시간을 선택해주세요.' }, { icon: '⏰' })
            return false
          }
        }

        if (deliveryMethod === 'regular' && !formData.address) {
          showError({ message: '배송 주소를 입력해주세요.' }, { icon: '📍' })
          return false
        }
      }

      if (usedPoints > 0) {
        if (usedPoints > userPoints) {
          showError({ message: '보유 포인트보다 많이 사용할 수 없습니다.' }, { icon: '⚠️' })
          return false
        }
        if (usedPoints > afterCouponDiscount) {
          showError({ message: '결제 금액보다 많은 포인트를 사용할 수 없습니다.' }, { icon: '⚠️' })
          return false
        }
      }

      if (!user) {
        showError({ message: '로그인이 필요합니다.' }, { icon: '🔒' })
        router.push('/auth/login?next=/checkout')
        return false
      }

      return true
    }

    // 내부 함수: 주문 생성
    const createOrder = async () => {
      const shippingAddress = isGiftMode 
        ? '선물 수령 대기' 
        : deliveryMethod === 'pickup'
        ? '매장 픽업'
        : deliveryMethod === 'quick'
        ? `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
        : `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
      
      const deliveryTime = isGiftMode 
        ? null 
        : deliveryMethod === 'pickup' 
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
          total_amount: orderTotal,
          delivery_type: isGiftMode ? 'regular' : deliveryMethod,
          delivery_time: deliveryTime,
          shipping_address: shippingAddress,
          shipping_name: isGiftMode ? '선물 수령 대기' : formData.name,
          shipping_phone: isGiftMode ? '' : formData.phone,
          delivery_note: formData.message.trim() || null,
          used_coupon_id: selectedCoupon?.id || null,
          used_points: usedPoints,
          is_gift: isGiftMode,
          gift_message: isGiftMode ? giftData.message : null,
          gift_card_design: isGiftMode ? giftData.cardDesign : null,
          gift_recipient_name: null,
          gift_recipient_phone: null,
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
      return order
    }

    // 내부 함수: 선물 공유
    const handleGiftShare = async (order: any) => {
      if (isGiftMode && order.gift_token) {
        await shareGiftToKakao({
          orderId: order.id,
          giftToken: order.gift_token,
          cardDesign: giftData.cardDesign,
          message: giftData.message,
          items: items.map(item => ({
            imageUrl: item.imageUrl || undefined,
          })),
        })
      }
    }

    // 내부 함수: 배송지 저장
    const saveAddressIfNeeded = async () => {
      if (!saveAsDefaultAddress || !formData.address) return
      if (deliveryMethod !== 'regular' && deliveryMethod !== 'quick') return

      try {
        const checkRes = await fetch('/api/addresses/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: formData.address.trim(),
            address_detail: (formData.addressDetail || '').trim() || null,
          }),
        })

        const checkData = await checkRes.json()
        const existing = checkData.existing
        const addressCount = (checkData.addressCount || 0) + 1

        if (existing) {
          await fetch(`/api/addresses/${existing.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: existing.name,
              recipient_name: formData.name,
              recipient_phone: formData.phone,
              zipcode: formData.zipcode || null,
              address: formData.address,
              address_detail: formData.addressDetail || null,
              delivery_note: formData.message || null,
              is_default: true,
            }),
          })
        } else {
          const addressName = deliveryMethod === 'quick' 
            ? `퀵배달 주소 ${addressCount}`
            : addressCount === 1 
              ? '기본 배송지'
              : `배송지 ${addressCount}`
          
          await fetch('/api/addresses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: addressName,
              recipient_name: formData.name,
              recipient_phone: formData.phone,
              zipcode: formData.zipcode || null,
              address: formData.address,
              address_detail: formData.addressDetail || null,
              delivery_note: formData.message || null,
              is_default: true,
            }),
          })
        }
      } catch (error) {
        // 배송지 저장 실패해도 주문은 완료
      }
    }

    // 내부 함수: 장바구니 정리
    const cleanupCart = async () => {
      if (isDirectPurchase) {
        clearDirectPurchase()
      } else {
        const purchasedItems = [...items]
        
        try {
          if (user?.id) {
            const handledGroups = new Set<string>()
            for (const it of purchasedItems) {
              const dbId = it.id
              const groupId = it.promotion_group_id
              if (groupId) {
                if (!handledGroups.has(groupId)) {
                  const success = await removeFromCartDB(user.id, dbId || '', groupId)
                  if (success) {
                    handledGroups.add(groupId)
                  }
                }
              } else if (dbId && !dbId.startsWith('cart-')) {
                await removeFromCartDB(user.id, dbId)
              }
            }
          }
        } catch (err) {
          // DB 삭제 실패해도 UI는 진행
        }
        
        removeSelectedFromCart()
      }
    }

    // 내부 함수: 성공 후 리다이렉트
    const redirectAfterSuccess = (order: any) => {
      if (isGiftMode && order.gift_token) {
        showSuccess('주문이 완료되었습니다! 카카오톡으로 선물을 공유해주세요.', {
          icon: '🎁',
          duration: 3000,
        })
      } else {
        showSuccess('주문이 완료되었습니다!', {
          icon: '🎉',
          duration: 3000,
        })
      }

      const t = window.setTimeout(() => {
        if (isGiftMode && order.gift_token) {
          router.push(`/orders?giftToken=${order.gift_token}`)
        } else {
          router.push('/orders')
        }
      }, isGiftMode ? 2000 : 1500)
      timeoutsRef.current.push(t)
    }

    // 메인 로직: 단계별 실행
    if (!validateBeforeSubmit()) {
      return
    }

    setFlags(prev => ({ ...prev, isProcessing: true }))

    try {
      const order = await createOrder()
      await handleGiftShare(order)
      await saveAddressIfNeeded()
      await cleanupCart()
      redirectAfterSuccess(order)
    } catch (error) {
      showError(error)
    } finally {
      setFlags(prev => ({ ...prev, isProcessing: false }))
    }
  }, [
    items,
    isGiftMode,
    currentStep,
    formData,
    deliveryMethod,
    pickupTime,
    quickDeliveryArea,
    quickDeliveryTime,
    usedPoints,
    userPoints,
    afterCouponDiscount,
    user,
    router,
    isDirectPurchase,
    orderTotal,
    selectedCoupon,
    giftData,
    saveAsDefaultAddress,
    clearDirectPurchase,
    removeSelectedFromCart,
  ])

  const handleSearchAddress = useCallback(() => {
    openDaumPostcode((data: AddressSearchResult) => {
      setFormData(prev => ({
        ...prev,
        zipcode: data.zonecode,
        address: data.address,
      }))

      const t = window.setTimeout(() => {
        const detailInput = document.getElementById('checkout_address_detail')
        if (detailInput) {
          detailInput.focus()
        }
      }, 100)
      timeoutsRef.current.push(t)
    })
  }, [])

  return {
    state: {
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
    },
    actions: {
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
    },
    derived: {
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
    },
  }
}

