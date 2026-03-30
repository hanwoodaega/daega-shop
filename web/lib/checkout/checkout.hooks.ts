'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getTossPayments, preloadTossPayments } from '@/lib/payments/toss-payments-loader'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/auth-context'
import { useDefaultAddress, useUserProfile } from '@/lib/address/useAddress'
import { openDaumPostcode, AddressSearchResult } from '@/lib/postcode/useDaumPostcode'
import { showError, showSuccess, showInfo } from '@/lib/utils/error-handler'
import { DeliveryState, FormData, Flags, GiftData } from './checkout.types'
import type { PricingResult } from '@/lib/order/pricing-types'
import { useCoupons } from '@/lib/swr'
import { isCouponValid } from '@/lib/coupon/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase/supabase'
import { removeFromCartDB } from '@/lib/cart/cart-db'
import { phoneDigitsOnly, sanitizePhoneDigits } from '@/lib/phone/kr'

const TOTAL_GIFT_STEPS = 1

/** draft 선갱신 debounce · 결제 시 재사용 시 만료 여유 */
const DRAFT_PREFETCH_DEBOUNCE_MS = 500
const DRAFT_REUSE_EXPIRY_BUFFER_MS = 60_000

interface UseCheckoutOptions {
  isGiftMode: boolean
}

export function useCheckout(options: UseCheckoutOptions) {
  const { isGiftMode } = options
  const router = useRouter()
  const { user } = useAuth()
  const timeoutsRef = useRef<number[]>([])
  const tossWidgetsRef = useRef<any>(null)
  const draftCacheRef = useRef<{
    fingerprint: string
    orderId: string
    amount: number
    taxFreeAmount: number
    expiresAtMs: number
  } | null>(null)
  const draftPrefetchGenRef = useRef(0)

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
  const [giftData, setGiftData] = useState<GiftData>({
    recipientName: '',
    recipientPhone: '',
  })

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

  const [currentStep, setCurrentStep] = useState(1)

  // Hooks
  const { address: defaultAddress, loading: loadingDefaultAddress, hasDefaultAddress } = useDefaultAddress()
  const { profile: userProfile, loading: loadingUserProfile } = useUserProfile()

  // Derived values
  const { method: deliveryMethod, pickupTime } = deliveryState
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

  // Effects
  const restoreDeliveryFromSession = useCallback(() => {
    let savedDeliveryMethod = sessionStorage.getItem('deliveryMethod') as
      | 'pickup'
      | 'quick'
      | 'regular'
      | null
    const savedPickupTime = sessionStorage.getItem('pickupTime') || ''
    if (savedDeliveryMethod === 'quick') {
      savedDeliveryMethod = 'regular'
      sessionStorage.setItem('deliveryMethod', 'regular')
    }
    if (savedDeliveryMethod === 'pickup' || savedDeliveryMethod === 'regular') {
      setDeliveryState({
        method: savedDeliveryMethod,
        pickupTime: savedPickupTime,
      })
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
    preloadTossPayments()
  }, [])

  useEffect(() => {
    if (isGiftMode) return
    if (defaultAddress) {
      setFormData(prev => ({
        ...prev,
        zipcode: defaultAddress.zipcode || '',
        address: defaultAddress.address || '',
        addressDetail: defaultAddress.address_detail || '',
        message: defaultAddress.delivery_note || '',
      }))
      setGiftData(prev => ({
        ...prev,
        recipientName: defaultAddress.recipient_name || '',
        recipientPhone: defaultAddress.recipient_phone || '',
      }))
    } else if (!hasDefaultAddress) {
      setFlags(prev => ({ ...prev, saveAsDefaultAddress: true }))
    }
  }, [defaultAddress, hasDefaultAddress, isGiftMode])

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
    const deliveryTime = isGiftMode ? null : deliveryMethod === 'pickup' ? pickupTime : null

    return {
      delivery_type: isGiftMode ? 'regular' : deliveryMethod,
      delivery_time: deliveryTime,
      shipping_address: '',
      shipping_name: '',
      shipping_phone: '',
      delivery_note: null,
      used_coupon_id: selectedCoupon?.id || null,
      used_points: usedPoints,
      is_gift: false,
      gift_message: null,
      gift_recipient_phone: isGiftMode ? sanitizePhoneDigits(giftData.recipientPhone || '') : undefined,
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
    selectedCoupon?.id,
    usedPoints,
    items,
  ])

  const pricingKey = useMemo(
    () => (items.length === 0 ? '' : JSON.stringify(buildPricingInput())),
    // itemsSignature 등 내용 기준으로만 변경. buildPricingInput 제외해 매 렌더 abort 방지
    [itemsSignature, isGiftMode, deliveryMethod, pickupTime, selectedCoupon?.id, usedPoints]
  )

  const buildOrderInput = useCallback(() => {
    const normalizedPhone = sanitizePhoneDigits(formData.phone || '')
    const recipientPhone = sanitizePhoneDigits(giftData.recipientPhone || '')
    const recipientName = (giftData.recipientName || '').trim()
    const resolvedRecipientName = isGiftMode ? recipientName : (recipientName || formData.name)
    const resolvedRecipientPhone = isGiftMode ? recipientPhone : (recipientPhone || normalizedPhone)
    const shippingAddress = deliveryMethod === 'pickup'
      ? '매장 픽업'
      : `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`

    const deliveryTime = isGiftMode ? null : deliveryMethod === 'pickup' ? pickupTime : null

    return {
      delivery_type: isGiftMode ? 'regular' : deliveryMethod,
      delivery_time: deliveryTime,
      shipping_address: shippingAddress,
      shipping_name: resolvedRecipientName,
      shipping_phone: resolvedRecipientPhone,
      orderer_name: isGiftMode ? formData.name.trim() : formData.name,
      orderer_phone: normalizedPhone,
      recipient_name: resolvedRecipientName,
      recipient_phone: resolvedRecipientPhone,
      delivery_note: formData.message.trim() || null,
      used_coupon_id: selectedCoupon?.id || null,
      used_points: usedPoints,
      is_gift: false,
      gift_message: null,
      gift_recipient_phone: isGiftMode ? recipientPhone : undefined,
      gift_recipient_name: isGiftMode ? (giftData.recipientName || '').trim() || undefined : undefined,
      gift_sender_name: undefined,
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
    formData.address,
    formData.addressDetail,
    formData.name,
    formData.phone,
    formData.message,
    selectedCoupon?.id,
    usedPoints,
    giftData.recipientName,
    giftData.recipientPhone,
    paymentMethod,
    items,
  ])

  const isOrderInputReadyForDraftPrefetch = useCallback((): boolean => {
    if (items.length === 0) return false
    if (isGiftMode) {
      if (currentStep < TOTAL_GIFT_STEPS) return false
      if (!formData.name?.trim() || !formData.phone?.trim()) return false
      if (!(giftData.recipientName || '').trim()) return false
      const recipientPhone = phoneDigitsOnly(giftData.recipientPhone || '')
      if (recipientPhone.length < 10) return false
      if (!formData.address?.trim()) return false
      return true
    }
    if (!formData.name?.trim() || !formData.phone?.trim()) return false
    if (deliveryMethod === 'pickup') return !!pickupTime
    if (deliveryMethod === 'regular') return !!formData.address?.trim()
    return false
  }, [
    items.length,
    isGiftMode,
    currentStep,
    formData.name,
    formData.phone,
    formData.address,
    giftData.recipientName,
    giftData.recipientPhone,
    deliveryMethod,
    pickupTime,
  ])

  const orderInputFingerprint = useMemo(
    () => JSON.stringify(buildOrderInput()),
    [
      isGiftMode,
      deliveryMethod,
      pickupTime,
      formData.address,
      formData.addressDetail,
      formData.name,
      formData.phone,
      formData.message,
      selectedCoupon?.id,
      usedPoints,
      giftData.recipientName,
      giftData.recipientPhone,
      paymentMethod,
      itemsSignature,
      currentStep,
    ]
  )

  useEffect(() => {
    if (!isOrderInputReadyForDraftPrefetch()) {
      draftCacheRef.current = null
      return
    }

    const myGen = ++draftPrefetchGenRef.current
    const timer = window.setTimeout(async () => {
      if (myGen !== draftPrefetchGenRef.current) return

      try {
        const orderInput = buildOrderInput()
        const res = await fetch('/api/orders/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderInput }),
        })

        if (myGen !== draftPrefetchGenRef.current) return

        if (!res.ok) {
          draftCacheRef.current = null
          return
        }

        const data = await res.json()
        if (myGen !== draftPrefetchGenRef.current) return

        const orderId = data.orderId as string
        const amount = Number(data.amount)
        const taxFreeAmount = Number(data.taxFreeAmount ?? 0)
        const expiresAtRaw = data.expiresAt as string | undefined
        const expiresAtMs = expiresAtRaw
          ? new Date(expiresAtRaw).getTime()
          : Date.now() + 30 * 60 * 1000

        if (!orderId || !Number.isFinite(amount) || amount < 0) {
          draftCacheRef.current = null
          return
        }

        draftCacheRef.current = {
          fingerprint: JSON.stringify(orderInput),
          orderId,
          amount,
          taxFreeAmount,
          expiresAtMs,
        }
      } catch {
        if (myGen === draftPrefetchGenRef.current) {
          draftCacheRef.current = null
        }
      }
    }, DRAFT_PREFETCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    orderInputFingerprint,
    isOrderInputReadyForDraftPrefetch,
    buildOrderInput,
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
      zipcode: address.zipcode || '',
      address: address.address || '',
      addressDetail: address.address_detail || '',
      message: address.delivery_note || '',
    }))
    setGiftData(prev => ({
      ...prev,
      recipientName: address.recipient_name || '',
      recipientPhone: address.recipient_phone || '',
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

    if (currentStep === 1) {
      // 1단계: 요약 확인
    }

    if (currentStep === 2) {
      if (!formData.name.trim() || !formData.phone.trim()) {
        toast.error('주문자 정보를 입력해주세요.')
        return
      }
      if (!(giftData.recipientName || '').trim()) {
        toast.error('받는 분 이름을 입력해주세요.')
        return
      }
      const recipientPhone = phoneDigitsOnly(giftData.recipientPhone || '')
      if (recipientPhone.length < 10) {
        toast.error('받는 분 연락처를 입력해주세요.')
        return
      }
      if (!formData.address.trim()) {
        toast.error('배송 주소를 입력해주세요.')
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, TOTAL_GIFT_STEPS))
  }, [isGiftMode, currentStep, formData.name, formData.phone, formData.address, giftData.recipientName, giftData.recipientPhone])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const validateBeforeSubmit = (): boolean => {
      const validationToast = (msg: string) => {
        toast.error(msg, { icon: null, duration: 2000 })
      }

      if (items.length === 0) {
        validationToast('주문할 상품이 없습니다.')
        router.push(isDirectPurchase ? '/products' : '/cart')
        return false
      }

      if (isGiftMode && currentStep < TOTAL_GIFT_STEPS) {
        showInfo('다음 단계를 진행해주세요.')
        return false
      }

      if (isGiftMode) {
        if (!formData.name?.trim() || !formData.phone?.trim()) {
          validationToast('주문자 정보를 입력해주세요.')
          return false
        }
        if (!(giftData.recipientName || '').trim()) {
          validationToast('받는 분 이름을 입력해주세요.')
          return false
        }
        const recipientPhone = phoneDigitsOnly(giftData.recipientPhone || '')
        if (recipientPhone.length < 10) {
          validationToast('받는 분 연락처를 입력해주세요.')
          return false
        }
        if (!formData.address?.trim()) {
          validationToast('받는 분 배송 정보를 입력해주세요.')
          return false
        }
      }

      if (!isGiftMode) {
        if (!formData.name || !formData.phone) {
          validationToast('필수 항목을 모두 입력해주세요.')
          return false
        }

        if (deliveryMethod === 'pickup' && !pickupTime) {
          validationToast('픽업 시간을 선택해주세요.')
          return false
        }

        if (deliveryMethod === 'regular' && !formData.address) {
          validationToast('배송 주소를 입력해주세요.')
          return false
        }
      }

      if (user && usedPoints > 0) {
        if (usedPoints > userPoints) {
          validationToast('보유 포인트보다 많이 사용할 수 없습니다.')
          return false
        }
        if (usedPoints > displayAfterCouponDiscount) {
          validationToast('결제 금액보다 많은 포인트를 사용할 수 없습니다.')
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
      const fp = JSON.stringify(orderInput)

      const now = Date.now()
      const cache = draftCacheRef.current
      const cacheReusable =
        cache &&
        cache.fingerprint === fp &&
        cache.orderId &&
        Number.isFinite(cache.amount) &&
        cache.expiresAtMs - DRAFT_REUSE_EXPIRY_BUFFER_MS > now

      let orderId: string
      let amount: number
      let taxFreeAmount: number

      if (cacheReusable) {
        orderId = cache.orderId
        amount = cache.amount
        taxFreeAmount = cache.taxFreeAmount
      } else {
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
        orderId = draftData.orderId
        amount = Number(draftData.amount)
        taxFreeAmount = Number(draftData.taxFreeAmount ?? 0)

        if (!orderId || !Number.isFinite(amount) || amount < 0) {
          throw new Error('주문 정보를 불러오지 못했습니다.')
        }

        const expiresAtRaw = draftData.expiresAt as string | undefined
        draftCacheRef.current = {
          fingerprint: fp,
          orderId,
          amount,
          taxFreeAmount,
          expiresAtMs: expiresAtRaw
            ? new Date(expiresAtRaw).getTime()
            : Date.now() + 30 * 60 * 1000,
        }
      }

      const meta = {
        isDirectPurchase,
        isGiftMode,
        saveAsDefaultAddress,
        deliveryMethod,
        formData,
          orderInput: {
          shipping_phone: orderInput.shipping_phone,
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

      const profileName = (userProfile?.name || '').trim()
      const profilePhone = phoneDigitsOnly(userProfile?.phone || '')
      const inputName = (formData.name || '').trim()
      const inputPhone = phoneDigitsOnly(formData.phone || '')
      const paymentCustomerName = user ? (profileName || inputName) : inputName
      const paymentCustomerPhone = user ? (profilePhone || inputPhone) : inputPhone

      if (paymentCustomerPhone.length < 10 || paymentCustomerPhone.length > 11) {
        throw new Error('휴대폰 번호를 확인해주세요.')
      }

      const normalizedEmail = (user ? (user.email || '') : (formData.email || '')).trim()
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
        customerName: paymentCustomerName,
        customerEmail: normalizedEmail && !isInternalEmail ? normalizedEmail : undefined,
        customerMobilePhone: paymentCustomerPhone,
      }
      if (Number.isFinite(taxFreeAmount) && taxFreeAmount >= 0) {
        paymentOptions.taxFreeAmount = taxFreeAmount
      }
      if (methodConfig.easyPay) {
        paymentOptions.easyPay = methodConfig.easyPay
      }

      const customerKey = user?.id ?? `guest_${orderId}`

      if (tossWidgetsRef.current) {
        await tossWidgetsRef.current.setAmount({ currency: 'KRW', value: amount })
        await tossWidgetsRef.current.requestPayment({
          orderId,
          orderName,
          successUrl,
          failUrl,
          customerName: paymentCustomerName,
          customerEmail: normalizedEmail && !isInternalEmail ? normalizedEmail : undefined,
          customerMobilePhone: paymentCustomerPhone || undefined,
          ...(Number.isFinite(taxFreeAmount) && taxFreeAmount >= 0 ? { taxFreeAmount } : {}),
        })
        return
      }

      const tossPayments = await getTossPayments(tossClientKey)
      const payment = (tossPayments as any).payment({ customerKey })
      await payment.requestPayment(paymentOptions)
    }

    const saveAddressIfNeeded = async () => {
      if (!saveAsDefaultAddress || !formData.address) return
      if (deliveryMethod !== 'regular') return

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
              recipient_name: (giftData.recipientName || '').trim() || formData.name,
              recipient_phone: sanitizePhoneDigits(giftData.recipientPhone || '') || formData.phone,
              zipcode: formData.zipcode || null,
              address: formData.address,
              address_detail: formData.addressDetail || null,
              delivery_note: formData.message || null,
              is_default: true,
            }),
          })
        } else {
          const addressName =
            addressCount === 1 ? '기본 배송지' : `배송지 ${addressCount}`
          
          await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: addressName,
              recipient_name: (giftData.recipientName || '').trim() || formData.name,
              recipient_phone: sanitizePhoneDigits(giftData.recipientPhone || '') || formData.phone,
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
          duration: 2000,
        })
      } else {
        showSuccess('주문이 완료되었습니다!', {
          duration: 2000,
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
    usedPoints,
    userPoints,
    displayAfterCouponDiscount,
    user,
    userProfile,
    router,
    isDirectPurchase,
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
      defaultAddress,
      loadingDefaultAddress,
      hasDefaultAddress,
      userProfile,
      loadingUserProfile,
    },
  }
}


