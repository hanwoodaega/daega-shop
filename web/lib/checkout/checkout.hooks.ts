'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { useDefaultAddress, useUserProfile } from '@/lib/address/useAddress'
import { openDaumPostcode, AddressSearchResult } from '@/lib/postcode/useDaumPostcode'
import { showError, showSuccess, showInfo } from '@/lib/utils/error-handler'
import { formatPrice } from '@/lib/utils/utils'
import { DeliveryState, FormData, Flags, GiftData } from './checkout.types'
import { GIFT_MIN_AMOUNT } from '@/lib/utils/constants'
import type { PricingResult } from '@/lib/order/pricing-types'
import { useCoupons } from '@/lib/swr'
import { isCouponValid } from '@/lib/coupon/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { removeFromCartDB } from '@/lib/cart/cart-db'

const TOTAL_GIFT_STEPS = 3

interface UseCheckoutOptions {
  isGiftMode: boolean
}

export function useCheckout(options: UseCheckoutOptions) {
  const { isGiftMode } = options
  const router = useRouter()
  const { user } = useAuth()
  const timeoutsRef = useRef<number[]>([])
  const tossWidgetsRef = useRef<any>(null)

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
  })

  const { coupons: couponsFromApi, isLoading: loadingCoupons } = useCoupons(false)
  const availableCoupons = useMemo(
    () =>
      couponsFromApi.filter((uc) => isCouponValid(uc, (uc.coupon as Coupon))),
    [couponsFromApi]
  )

  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)

  const [userPoints, setUserPoints] = useState(0)
  const [usedPoints, setUsedPoints] = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [usedPointsInput, setUsedPointsInput] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('card')

  const [serverPricing, setServerPricing] = useState<PricingResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  const itemsSignature = useMemo(
    () =>
      items
        .map(item => `${item.productId}:${item.quantity}:${item.promotion_group_id || ''}`)
        .sort()
        .join('|'),
    [items]
  )

  const [giftData, setGiftData] = useState<GiftData>({
    message: '',
    recipientName: '',
    recipientPhone: '',
  })

  const [currentStep, setCurrentStep] = useState(1)

  // Hooks
  const { address: defaultAddress, loading: loadingDefaultAddress, hasDefaultAddress } = useDefaultAddress()
  const { profile: userProfile, loading: loadingUserProfile } = useUserProfile()

  // Derived values
  const { method: deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime } = deliveryState
  const { isProcessing, mounted, saveAsDefaultAddress } = flags
  const isGiftFinalStep = !isGiftMode || currentStep === TOTAL_GIFT_STEPS
  const gridColumnsClass = isGiftFinalStep ? 'lg:grid-cols-3' : 'lg:grid-cols-1'

  // Order calculations: 서버 금액만 사용. 클라이언트는 계산하지 않음.
  const subtotal = serverPricing?.discountedTotal ?? 0

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

  // 표시용: 서버 pricing 우선, 없으면 0 (로딩 중)
  const displayOriginalTotal = serverPricing?.originalTotal ?? 0
  const displayDiscountedTotal = serverPricing?.discountedTotal ?? 0
  const displayDiscountAmount = Math.max(0, displayOriginalTotal - displayDiscountedTotal)
  const displayCouponDiscount = serverPricing?.couponDiscount ?? couponDiscount
  const displayUsedPoints = serverPricing?.appliedPoints ?? usedPoints
  const displayShipping = serverPricing?.shipping ?? 0
  const displayAfterCouponDiscount = Math.max(0, displayDiscountedTotal - displayCouponDiscount)
  const displayFinalTotal = Math.max(0, displayDiscountedTotal - displayCouponDiscount - displayUsedPoints)
  const displayOrderTotal = displayFinalTotal + displayShipping

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
  }, [])

  const initOnMount = useCallback(() => {
    restoreDeliveryFromSession()
    setFlags(prev => ({ ...prev, mounted: true }))
    if (isGiftMode) {
      setCurrentStep(1)
    }
  }, [isGiftMode, restoreDeliveryFromSession])

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
        email: prev.email || '',
      }))
    }
  }, [userProfile, user?.email])

  useEffect(() => {
    if (user?.id) {
      loadUserPoints()
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

  const buildPricingInput = useCallback(() => {
    const deliveryTime = isGiftMode
      ? null
      : deliveryMethod === 'pickup'
      ? pickupTime
      : deliveryMethod === 'quick'
      ? quickDeliveryTime
      : null

    return {
      delivery_type: isGiftMode ? 'regular' : deliveryMethod,
      delivery_time: deliveryTime,
      shipping_address: '',
      shipping_name: '',
      shipping_phone: '',
      delivery_note: null,
      used_coupon_id: selectedCoupon?.id || null,
      used_points: usedPoints,
      is_gift: isGiftMode,
      gift_message: null,
      gift_recipient_phone: isGiftMode ? (giftData.recipientPhone || '').replace(/\D/g, '').slice(0, 13) : undefined,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        promotion_group_id: item.promotion_group_id || null,
      })),
    }
  }, [
    isGiftMode,
    deliveryMethod,
    pickupTime,
    quickDeliveryTime,
    selectedCoupon?.id,
    usedPoints,
    items,
  ])

  const pricingKey = useMemo(
    () => (items.length === 0 ? '' : JSON.stringify(buildPricingInput())),
    // itemsSignature 등 내용 기준으로만 변경. buildPricingInput 제외해 매 렌더 abort 방지
    [itemsSignature, isGiftMode, deliveryMethod, pickupTime, quickDeliveryTime, selectedCoupon?.id, usedPoints]
  )

  const buildOrderInput = useCallback(() => {
    const normalizedPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 13)
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

    return {
      delivery_type: isGiftMode ? 'regular' : deliveryMethod,
      delivery_time: deliveryTime,
      shipping_address: shippingAddress,
      shipping_name: isGiftMode ? '선물 수령 대기' : formData.name,
      shipping_phone: isGiftMode ? '' : normalizedPhone,
      delivery_note: formData.message.trim() || null,
      used_coupon_id: selectedCoupon?.id || null,
      used_points: usedPoints,
      is_gift: isGiftMode,
      gift_message: isGiftMode ? giftData.message : null,
      gift_recipient_phone: isGiftMode ? (giftData.recipientPhone || '').replace(/\D/g, '').slice(0, 13) : undefined,
      gift_recipient_name: isGiftMode ? (giftData.recipientName || '').trim() || undefined : undefined,
      orderer_phone: isGiftMode ? normalizedPhone : undefined,
      gift_sender_name: isGiftMode ? (formData.name || '').trim() || undefined : undefined,
      payment_method: paymentMethod,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        promotion_group_id: item.promotion_group_id || null,
      })),
    }
  }, [
    isGiftMode,
    deliveryMethod,
    pickupTime,
    quickDeliveryTime,
    formData.address,
    formData.addressDetail,
    formData.name,
    formData.phone,
    formData.message,
    selectedCoupon?.id,
    usedPoints,
    giftData.message,
    giftData.recipientName,
    giftData.recipientPhone,
    paymentMethod,
    items,
  ])

  useEffect(() => {
    if (!pricingKey) {
      setServerPricing(null)
      return
    }

    let isActive = true
    const controller = new AbortController()

    const fetchPricing = async () => {
      setPricingLoading(true)
      try {
        const orderInput = JSON.parse(pricingKey) as object
        const res = await fetch('/api/orders/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderInput }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || '결제 금액 계산 실패')
        }

        const data = await res.json()
        if (!isActive) return

        setServerPricing(data.pricing ?? null)

        if (user?.id && data?.pricing?.appliedPoints !== undefined && data.pricing.appliedPoints !== usedPoints) {
          setUsedPoints(data.pricing.appliedPoints)
          setUsedPointsInput(String(data.pricing.appliedPoints || ''))
        }
      } catch (error) {
        if (!isActive) return
        console.error('결제 금액 계산 실패:', error)
      } finally {
        setPricingLoading(false)
      }
    }

    fetchPricing()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [pricingKey, user?.id])

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

    const expectedAmount = displayFinalTotal + displayShipping
    
    if (expectedAmount < GIFT_MIN_AMOUNT) {
      toast.error(`선물하기는 결제 금액이 ${formatPrice(GIFT_MIN_AMOUNT)}원 이상이어야 합니다.`)
      return
    }

    if (currentStep === 1) {
      // 1단계: 금액만 확인 (보내는 분은 2단계에서 입력)
    }

    if (currentStep === 2) {
      if (!formData.name.trim() || !formData.phone.trim()) {
        toast.error('보내는 분 정보를 입력해주세요.')
        return
      }
      if (!(giftData.recipientName || '').trim()) {
        toast.error('받는 분 이름을 입력해주세요.')
        return
      }
      const phone = (giftData.recipientPhone || '').replace(/\D/g, '')
      if (phone.length < 10) {
        toast.error('받는 분 휴대폰 번호를 입력해주세요.')
        return
      }
      if (!(giftData.message || '').trim()) {
        toast.error('선물 메시지를 입력해주세요.')
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, TOTAL_GIFT_STEPS))
  }, [isGiftMode, currentStep, displayFinalTotal, displayShipping, formData.name, formData.phone, giftData.recipientName, giftData.recipientPhone, giftData.message])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const validateBeforeSubmit = (): boolean => {
      if (items.length === 0) {
        showError({ message: '주문할 상품이 없습니다.' })
        router.push(isDirectPurchase ? '/products' : '/cart')
        return false
      }

      if (isGiftMode && currentStep < TOTAL_GIFT_STEPS) {
        showInfo('다음 단계를 진행해주세요.')
        return false
      }

      if (isGiftMode) {
        const recipientPhone = (giftData.recipientPhone || '').replace(/\D/g, '')
        if (recipientPhone.length < 10) {
          showError({ message: '받는 분 휴대폰 번호를 입력해주세요.' })
          return false
        }
        if (!(giftData.recipientName || '').trim()) {
          showError({ message: '받는 분 이름을 입력해주세요.' })
          return false
        }
        if (!(giftData.message || '').trim()) {
          showError({ message: '선물 메시지를 입력해주세요.' })
          return false
        }
        if (!formData.name?.trim() || !formData.phone?.trim()) {
          showError({ message: '보내는 분 정보를 입력해주세요.' })
          return false
        }
      }

      if (!isGiftMode) {
        if (!formData.name || !formData.phone) {
          showError({ message: '필수 항목을 모두 입력해주세요.' })
          return false
        }

        if (deliveryMethod === 'pickup' && !pickupTime) {
          showError({ message: '픽업 시간을 선택해주세요.' })
          return false
        }

        if (deliveryMethod === 'quick') {
          if (!quickDeliveryArea) {
            showError({ message: '배달 지역을 선택해주세요.' })
            return false
          }
          if (!formData.address) {
            showError({ message: '상세 주소를 입력해주세요.' })
            return false
          }
          if (!quickDeliveryTime) {
            showError({ message: '배달 시간을 선택해주세요.' })
            return false
          }
        }

        if (deliveryMethod === 'regular' && !formData.address) {
          showError({ message: '배송 주소를 입력해주세요.' })
          return false
        }
      }

      if (user && usedPoints > 0) {
        if (usedPoints > userPoints) {
          showError({ message: '보유 포인트보다 많이 사용할 수 없습니다.' })
          return false
        }
        if (usedPoints > displayAfterCouponDiscount) {
          showError({ message: '결제 금액보다 많은 포인트를 사용할 수 없습니다.' })
          return false
        }
      }

      return true
    }

    const isUserCancelledPayment = (error: any) => {
      const code = String(error?.code || '')
      const message = String(error?.message || '')
      const combined = `${code} ${message}`.toLowerCase()
      return (
        combined.includes('user_cancel') ||
        combined.includes('cancel') ||
        combined.includes('취소') ||
        combined.includes('canceled') ||
        combined.includes('cancelled')
      )
    }

    const startTossPayment = async () => {
      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      const shouldMockToss =
        process.env.NEXT_PUBLIC_TOSS_MOCK === 'true' ||
        (!tossClientKey && process.env.NODE_ENV !== 'production')

      const orderInput = buildOrderInput()

      const draftRes = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderInput }),
      })

      if (!draftRes.ok) {
        const errorData = await draftRes.json().catch(() => ({}))
        throw new Error(errorData.error || '주문 초안 생성에 실패했습니다.')
      }

      const draftData = await draftRes.json()
      const orderId = draftData.orderId
      const amount = Number(draftData.amount)
      const taxFreeAmount = Number(draftData.taxFreeAmount ?? 0)

      if (!orderId || !Number.isFinite(amount) || amount < 0) {
        throw new Error('주문 정보를 불러오지 못했습니다.')
      }

      const meta = {
        isDirectPurchase,
        isGiftMode,
        saveAsDefaultAddress,
        deliveryMethod,
        formData,
        orderInput: {
          shipping_phone: orderInput.shipping_phone,
          orderer_phone: orderInput.orderer_phone,
        },
      }
      sessionStorage.setItem(`toss_checkout_${orderId}`, JSON.stringify(meta))

      if (shouldMockToss) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        const mockSuccessUrl = `${baseUrl}/checkout/toss/success?paymentKey=MOCK_${orderId}&orderId=${orderId}&mock=1`
        router.push(mockSuccessUrl)
        return
      }

      if (!tossClientKey) {
        throw new Error('결제 설정이 없습니다.')
      }

      const rawOrderName = items.length > 1
        ? `${items[0]?.name || '상품'} 외 ${items.length - 1}건`
        : (items[0]?.name || '상품')
      const orderName = rawOrderName.length > 100 ? `${rawOrderName.slice(0, 97)}...` : rawOrderName

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const successUrl = `${baseUrl}/checkout/toss/success`
      const failUrl = `${baseUrl}/checkout/toss/fail`

      const sanitizedPhone = (formData.phone || '').replace(/\D/g, '')
      if (sanitizedPhone.length < 10 || sanitizedPhone.length > 11) {
        throw new Error('휴대폰 번호를 확인해주세요.')
      }

      const normalizedEmail = (formData.email || '').trim()
      const emailDomain = normalizedEmail.split('@')[1] || ''
      const isInternalEmail =
        normalizedEmail === (user?.email || '') &&
        (emailDomain.endsWith('.local') || emailDomain.endsWith('thedaega.local'))

      const methodMap: Record<string, { method: string; easyPay?: { provider: string } }> = {
        card: { method: 'CARD' },
        transfer: { method: 'TRANSFER' },
        virtual: { method: 'VIRTUAL_ACCOUNT' },
        naverpay: { method: 'EASY_PAY', easyPay: { provider: 'NAVERPAY' } },
        kakaopay: { method: 'EASY_PAY', easyPay: { provider: 'KAKAOPAY' } },
        tosspay: { method: 'EASY_PAY', easyPay: { provider: 'TOSSPAY' } },
        samsungpay: { method: 'EASY_PAY', easyPay: { provider: 'SAMSUNGPAY' } },
        applepay: { method: 'EASY_PAY', easyPay: { provider: 'APPLEPAY' } },
      }
      const methodConfig = methodMap[paymentMethod] || { method: 'CARD' }

      const paymentOptions: any = {
        method: methodConfig.method,
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerName: formData.name.trim(),
        customerEmail: normalizedEmail && !isInternalEmail ? normalizedEmail : undefined,
        customerMobilePhone: sanitizedPhone,
      }
      if (Number.isFinite(taxFreeAmount) && taxFreeAmount >= 0) {
        paymentOptions.taxFreeAmount = taxFreeAmount
      }
      if (methodConfig.easyPay) {
        paymentOptions.easyPay = methodConfig.easyPay
      }

      const customerKey = user?.id ?? `guest_${orderId}`

      if (tossWidgetsRef.current) {
        await tossWidgetsRef.current.requestPayment({
          orderId,
          orderName,
          successUrl,
          failUrl,
          customerName: formData.name.trim(),
          customerEmail: normalizedEmail && !isInternalEmail ? normalizedEmail : undefined,
          customerMobilePhone: sanitizedPhone || undefined,
          ...(Number.isFinite(taxFreeAmount) && taxFreeAmount >= 0 ? { taxFreeAmount } : {}),
        })
        return
      }

      const tossPayments = await loadTossPayments(tossClientKey)
      const payment = (tossPayments as any).payment({ customerKey })
      await payment.requestPayment(paymentOptions)
    }

    const saveAddressIfNeeded = async () => {
      if (!saveAsDefaultAddress || !formData.address) return
      if (deliveryMethod !== 'regular' && deliveryMethod !== 'quick') return

      try {
        const checkRes = await fetch('/api/addresses/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
                  const success = await removeFromCartDB(user.id, {
                  cartId: dbId || undefined,
                  promotionGroupId: groupId,
                })
                  if (success) {
                    handledGroups.add(groupId)
                  }
                }
              } else if (dbId && !dbId.startsWith('cart-')) {
                await removeFromCartDB(user.id, { cartId: dbId })
              }
            }
          }
        } catch (err) {
          // DB 삭제 실패해도 UI는 진행
        }

        removeSelectedFromCart()
      }
    }

    const redirectAfterSuccess = (order: any, giftToken?: string | null) => {
      if (isGiftMode && giftToken) {
        showSuccess('주문이 완료되었습니다! 카카오톡으로 선물을 공유해주세요.', {
          duration: 3000,
        })
      } else {
        showSuccess('주문이 완료되었습니다!', {
          duration: 3000,
        })
      }

      const t = window.setTimeout(() => {
        if (isGiftMode && giftToken) {
          router.push(`/orders?giftToken=${giftToken}`)
        } else {
          router.push('/orders')
        }
      }, isGiftMode ? 2000 : 1500)
      timeoutsRef.current.push(t)
    }

    if (!validateBeforeSubmit()) {
      return
    }

    setFlags(prev => ({ ...prev, isProcessing: true }))

    try {
      await startTossPayment()
    } catch (error) {
      if (isUserCancelledPayment(error)) {
        setFlags(prev => ({ ...prev, isProcessing: false }))
        return
      }
      showError(error)
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
    displayAfterCouponDiscount,
    user,
    router,
    isDirectPurchase,
    displayFinalTotal,
    displayShipping,
    selectedCoupon,
    giftData,
    saveAsDefaultAddress,
    buildOrderInput,
    clearDirectPurchase,
    removeSelectedFromCart,
  ])

  const setTossWidgets = useCallback((widgets: any) => {
    tossWidgetsRef.current = widgets
  }, [])

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
      setGiftData,
      setCurrentStep,
      handleSubmit,
      handleNextStep,
      handleSearchAddress,
      setTossWidgets,
      loadUserPoints,
      applyAddress,
      handleInputChange,
    },
    derived: {
      deliveryMethod,
      pickupTime,
      quickDeliveryArea,
      quickDeliveryTime,
      isProcessing,
      pricingLoading,
      mounted,
      saveAsDefaultAddress,
      isGiftFinalStep,
      gridColumnsClass,
      originalTotal: displayOriginalTotal,
      discountAmount: displayDiscountAmount,
      shipping: displayShipping,
      discountedTotal: displayDiscountedTotal,
      orderTotal: displayOrderTotal,
      subtotal: displayDiscountedTotal,
      couponDiscount: displayCouponDiscount,
      afterCouponDiscount: displayAfterCouponDiscount,
      finalTotal: displayFinalTotal,
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


