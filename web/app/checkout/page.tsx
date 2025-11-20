'use client'

import { Fragment, useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Footer from '@/components/Footer'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useDaumPostcodeScript, openDaumPostcode, AddressSearchResult } from '@/lib/hooks/useDaumPostcode'
import { showError, showSuccess, handleSupabaseError, showInfo } from '@/lib/error-handler'
import { useDefaultAddress, useUserProfile } from '@/lib/hooks/useAddress'
import { calculateOrderTotal } from '@/lib/order-calc'
import { SHIPPING, GIFT_MIN_AMOUNT } from '@/lib/constants'
import { getUserCoupons, isCouponValid } from '@/lib/coupons'
import { UserCoupon, Coupon } from '@/lib/supabase'
import { getUserPoints } from '@/lib/points'
import { removeFromCartDB } from '@/lib/cart-db'

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const timeoutsRef = useRef<number[]>([])
  
  // 선물 모드 확인
  const isGiftMode = searchParams?.get('mode') === 'gift'
  
  // ✅ Selector 패턴 - 필요한 것만 구독
  const cartItems = useCartStore((state) => state.items)
  const getCartTotalPrice = useCartStore((state) => state.getTotalPrice)
  const removeSelectedFromCart = useCartStore((state) => state.removeSelectedItems)
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
    isEditingOrderer: false,
  })

  // 쿠폰 관련 state
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // 포인트 관련 state
  const [userPoints, setUserPoints] = useState(0)
  const [usedPoints, setUsedPoints] = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [usedPointsInput, setUsedPointsInput] = useState('')

  // 결제 방법 관련 state
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<any[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  // 선물 관련 state
  const [giftData, setGiftData] = useState({
    message: '',
    cardDesign: 'birthday' as 'birthday' | 'anniversary' | 'thanks' | 'custom',
    withMessage: true, // 메시지 함께 보내기 기본값
  })
  const [giftRecipient, setGiftRecipient] = useState({
    name: '',
    phone: '',
  })
  const totalGiftSteps = 3
  const [currentStep, setCurrentStep] = useState(1)
  const isGiftFinalStep = !isGiftMode || currentStep === totalGiftSteps
  const gridColumnsClass = isGiftFinalStep ? 'lg:grid-cols-3' : 'lg:grid-cols-1'
  
  const [kakaoSDKLoaded, setKakaoSDKLoaded] = useState(false)

  // Destructuring for backward compatibility
  const { method: deliveryMethod, pickupTime, quickDeliveryArea, quickDeliveryTime } = deliveryState
  const { isProcessing, mounted, saveAsDefaultAddress, isEditingOrderer } = flags

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

  useEffect(() => {
    setCurrentStep(1)
  }, [isGiftMode])

  // 카카오톡 SDK 로드
  useEffect(() => {
    if (isGiftMode && typeof window !== 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
      script.async = true
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
          if (kakaoAppKey) {
            window.Kakao.init(kakaoAppKey)
            setKakaoSDKLoaded(true)
          }
        } else if (window.Kakao?.isInitialized()) {
          setKakaoSDKLoaded(true)
        }
      }
      document.head.appendChild(script)

      return () => {
        // Cleanup은 하지 않음 (다른 곳에서도 사용할 수 있음)
      }
    }
  }, [isGiftMode])

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
      loadUserPoints()
      loadSavedCards()
    }
  }, [user?.id])

  const loadSavedCards = async () => {
    if (!user?.id) return

    setLoadingCards(true)
    try {
      const { data, error } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedCards(data || [])
      // 기본 카드가 있으면 자동 선택
      const defaultCard = data?.find((card: any) => card.is_default)
      if (defaultCard) {
        setSelectedCardId(defaultCard.id)
      }
    } catch (error) {
      console.error('카드 조회 실패:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const loadUserPoints = async () => {
    if (!user?.id) return

    setLoadingPoints(true)
    try {
      const pointsData = await getUserPoints(user.id)
      setUserPoints(pointsData?.total_points || 0)
    } catch (error) {
      console.error('포인트 조회 실패:', error)
    } finally {
      setLoadingPoints(false)
    }
  }

  // usedPoints 변화에 맞춰 입력 필드 동기화
  useEffect(() => {
    setUsedPointsInput(usedPoints ? String(usedPoints) : '')
  }, [usedPoints])

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

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!isGiftMode || currentStep >= totalGiftSteps) return

    // 선물하기는 결제 예상 금액이 최소 금액 이상이어야 함
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
      if (!giftRecipient.name.trim() || !giftRecipient.phone.trim()) {
        toast.error('받는 분 정보를 입력해주세요.', { icon: '🎁' })
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, totalGiftSteps))
  }

  const handleSelectKakaoFriend = async () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      showError({ message: '카카오톡 SDK가 로드되지 않았습니다.' })
      return
    }

    if (!user) {
      showError({ message: '로그인이 필요합니다.' })
      router.push('/auth/login?next=/checkout?mode=gift')
      return
    }

    // 선물 모드일 때는 결제를 먼저 진행하고, 결제 완료 후 카카오톡 공유
    // 결제는 handleSubmit에서 처리하고, 여기서는 카카오톡 공유만 처리
    // 하지만 결제가 완료된 주문이 있어야 하므로, 
    // 실제로는 handleSubmit에서 결제 완료 후 카카오톡 공유를 호출해야 함
    
    showError({ message: '먼저 결제를 완료해주세요. 결제 완료 후 카카오톡으로 공유할 수 있습니다.' })
  }

  // 결제 완료 후 카카오톡 공유 함수
  const shareGiftToKakao = async (orderId: string, giftToken: string) => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      // SDK가 로드되지 않았으면 로드 시도
      const script = document.createElement('script')
      script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
      script.async = true
      script.onload = () => {
        const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
        if (kakaoAppKey) {
          window.Kakao.init(kakaoAppKey)
          performKakaoShare(orderId, giftToken)
        }
      }
      document.head.appendChild(script)
      return
    }

    performKakaoShare(orderId, giftToken)
  }

  const performKakaoShare = (orderId: string, giftToken: string) => {
    const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
    
    // 카드 디자인에 따른 제목 설정
    const cardDesignTitles: Record<string, string> = {
      birthday: '🎂 생일 축하 선물이 도착했습니다!',
      anniversary: '💝 기념일 선물이 도착했습니다!',
      thanks: '🙏 감사 인사 선물이 도착했습니다!',
      custom: '🎁 특별한 선물이 도착했습니다!',
    }
    
    const title = cardDesignTitles[giftData.cardDesign] || '🎁 선물이 도착했습니다!'

    // 카드 디자인 이미지 URL (선택한 카드 디자인 이미지 사용)
    const cardImageUrl = giftData.cardDesign 
      ? `${window.location.origin}/images/gift-cards/${giftData.cardDesign}.jpg`
      : items[0]?.imageUrl || `${window.location.origin}/images/gift-default.jpg`

    // 카카오톡 공유 API로 친구에게 공유
    // 메시지는 description에 포함되어 전송됩니다
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: title,
        description: giftData.message || '선물을 받아보세요!',
        imageUrl: cardImageUrl,
        link: {
          mobileWebUrl: giftLink,
          webUrl: giftLink,
        },
      },
      buttons: [
        {
          title: '선물 받기',
          link: {
            mobileWebUrl: giftLink,
            webUrl: giftLink,
          },
        },
      ],
    })
  }

  const handleSearchAddress = () => {
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
  }

  const getDeliveryFee = () => {
    if (deliveryMethod === 'pickup') return 0
    if (deliveryMethod === 'quick') return SHIPPING.QUICK_FEE
    // 일반 택배
    return getTotalPrice() >= SHIPPING.FREE_THRESHOLD ? 0 : SHIPPING.DEFAULT_FEE
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      showError({ message: '주문할 상품이 없습니다.' }, { icon: '📦' })
      router.push(isDirectPurchase ? '/products' : '/cart')
      return
    }

    if (isGiftMode && currentStep < totalGiftSteps) {
      showInfo('다음 단계를 진행해주세요.', { icon: '➡️' })
      return
    }

    // 선물 모드일 때는 카카오톡 공유를 통해 주문이 이미 생성되었을 수 있음
    // 세션에서 pending_gift_order_id 확인
    const pendingGiftOrderId = sessionStorage.getItem('pending_gift_order_id')

    // 선물 모드가 아닐 때만 배송 정보 검증
    if (!isGiftMode) {
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
    } else {
      if (!giftRecipient.name.trim() || !giftRecipient.phone.trim()) {
        showError({ message: '받는 분 이름과 연락처를 입력해주세요.' }, { icon: '🎁' })
        return
      }
    }

    // 포인트 사용 유효성 검사
    if (usedPoints > 0) {
      if (usedPoints > userPoints) {
        showError({ message: '보유 포인트보다 많이 사용할 수 없습니다.' }, { icon: '⚠️' })
        return
      }
      if (usedPoints > afterCouponDiscount) {
        showError({ message: '결제 금액보다 많은 포인트를 사용할 수 없습니다.' }, { icon: '⚠️' })
        return
      }
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
      // 선물 모드일 때는 배송 정보가 필요 없음 (받는 사람이 직접 입력)
      const shippingAddress = isGiftMode 
        ? '선물 수령 대기' 
        : deliveryMethod === 'pickup'
        ? '매장 픽업'
        : deliveryMethod === 'quick'
        ? `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
        : `${formData.address}${formData.addressDetail ? ' ' + formData.addressDetail : ''}`
      
      // total_amount는 쿠폰 할인 전 금액 + 배송비 (API에서 쿠폰/포인트 처리)
      const totalAmount = orderTotal

      // 실제로는 여기서 결제 API를 호출합니다 (토스페이먼츠, 카카오페이 등)
      // 데모를 위해 주문 정보만 저장하고 완료 페이지로 이동
      
      // 주문 저장 (API 통해서)
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
          total_amount: totalAmount,
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
          gift_recipient_name: isGiftMode ? giftRecipient.name.trim() : null,
          gift_recipient_phone: isGiftMode ? giftRecipient.phone.trim() : null,
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

      // 선물 모드이고 결제 완료된 경우 카카오톡 공유
      if (isGiftMode && order.gift_token) {
        // 결제 완료 후 카카오톡 공유
        setTimeout(() => {
          shareGiftToKakao(order.id, order.gift_token)
        }, 500)
      }

      // 기본 배송지로 저장 체크 시 배송지 저장 (택배 또는 퀵배달)
      if (saveAsDefaultAddress && (deliveryMethod === 'regular' || deliveryMethod === 'quick') && formData.address) {
        try {
          // 1) 기존 기본 배송지 해제
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .eq('is_default', true)

          // 2) 동일 주소가 이미 있으면 업데이트하여 기본으로 지정, 없으면 새로 생성
          const { data: existing, error: findError } = await supabase
            .from('addresses')
            .select('id')
            .eq('user_id', user.id)
            .eq('address', formData.address)
            .eq('address_detail', formData.addressDetail || null)
            .maybeSingle()

          if (!findError && existing) {
            await supabase
              .from('addresses')
              .update({
                recipient_name: formData.name,
                recipient_phone: formData.phone,
                zipcode: formData.zipcode || null,
                delivery_note: formData.message || null,
                is_default: true,
              })
              .eq('id', existing.id)
          } else {
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
          }
        } catch (error) {
          console.error('배송지 저장 실패:', error)
          // 배송지 저장 실패해도 주문은 완료
        }
      }

      // 바로구매면 세션 스토리지 비우기, 아니면 장바구니에서 결제된(선택된) 상품만 제거
      if (isDirectPurchase) {
        clearDirectPurchase()
      } else {
        // 주문에 사용된 항목들을 먼저 저장 (removeSelectedFromCart 호출 전)
        const purchasedItems = [...items]
        
        // 로그인 상태라면 DB 장바구니에서 먼저 삭제
        try {
          if (user?.id) {
            // 프로모션 그룹은 중복 삭제 방지를 위해 그룹 단위로 한 번만 처리
            const handledGroups = new Set<string>()
            for (const it of purchasedItems) {
              const dbId = it.id
              const groupId = it.promotion_group_id
              if (groupId) {
                if (!handledGroups.has(groupId)) {
                  const success = await removeFromCartDB(user.id, '', groupId)
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
          console.error('DB 장바구니 삭제 실패:', err)
        }
        
        // DB 삭제 후 localStorage에서도 제거
        removeSelectedFromCart()
      }

      // 주문 완료
      showSuccess('주문이 완료되었습니다!', {
        icon: '🎉',
        duration: 3000,
      })

      // 주문 완료 페이지로 이동
      const t = window.setTimeout(() => {
        if (isGiftMode && order.gift_token) {
          // 선물 모드일 때 토큰 포함하여 이동
          router.push(`/orders?giftToken=${order.gift_token}`)
        } else {
          router.push('/orders')
        }
      }, 1500)
      timeoutsRef.current.push(t)

    } catch (error) {
      showError(error)
    } finally {
      setFlags(prev => ({ ...prev, isProcessing: false }))
    }
  }

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

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
  const { originalTotal, discountAmount, shipping, discountedTotal, total: orderTotal } = calculateOrderTotal(items, deliveryMethod)
  const subtotal = discountedTotal
  
  const couponDiscount = calculateCouponDiscount(subtotal)
  const afterCouponDiscount = Math.max(0, subtotal - couponDiscount)
  const finalTotal = Math.max(0, afterCouponDiscount - usedPoints)

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
      {/* 주문/결제 전용 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => {
              if (isGiftMode && currentStep > 1) {
                setCurrentStep(prev => Math.max(prev - 1, 1))
              } else {
                router.back()
              }
            }}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              {isGiftMode ? '선물하기' : '주문/결제'}
            </h1>
          </div>

          {isGiftMode && (
            <div className="ml-auto mr-2 flex items-center gap-1.5">
              {[1, 2, 3].map((step, index) => (
                <Fragment key={step}>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      step <= currentStep ? 'bg-primary-800' : 'bg-gray-300'
                    }`}
                  ></div>
                  {index < 2 && (
                    <div
                      className={`w-4 h-0.5 ${
                        currentStep > step ? 'bg-primary-800' : 'bg-gray-300'
                      }`}
                    ></div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </header>
      
      <main className={`flex-1 container mx-auto px-4 py-4 ${isGiftMode ? 'bg-gray-50' : ''}`}>

        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className={`grid grid-cols-1 ${gridColumnsClass} ${isGiftFinalStep ? 'gap-4' : 'gap-8'}`}>
            {/* 주문 정보 입력 */}
            <div className={`space-y-3 ${isGiftFinalStep ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
              {/* 선물할 상품 목록 - 선물 모드 1단계 */}
              {isGiftMode && currentStep === 1 && (() => {
                // 프로모션 그룹별로 상품 묶기
                const groupedItems = items.reduce((acc, item) => {
                  if (item.promotion_group_id) {
                    if (!acc.groups[item.promotion_group_id]) {
                      acc.groups[item.promotion_group_id] = []
                    }
                    acc.groups[item.promotion_group_id].push(item)
                  } else {
                    acc.standalone.push(item)
                  }
                  return acc
                }, { groups: {} as { [key: string]: typeof items }, standalone: [] as typeof items })

                // 같은 상품(productId)을 합치는 함수
                const mergeSameProducts = (itemList: typeof items) => {
                  type ItemType = typeof items[0]
                  const merged = itemList.reduce((acc: { [key: string]: ItemType }, item: ItemType) => {
                    const key = item.productId
                    if (acc[key]) {
                      acc[key].quantity += item.quantity
                    } else {
                      acc[key] = { ...item }
                    }
                    return acc
                  }, {} as { [key: string]: ItemType })
                  return Object.values(merged) as ItemType[]
                }

                return (
                  <>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h2 className="text-lg font-bold mb-4">선물요약</h2>
                      <div className="space-y-3">
                        {/* 프로모션 그룹 상품들 */}
                        {Object.entries(groupedItems.groups).flatMap(([groupId, groupItems], groupIndex, groupsArray) => {
                          const mergedGroupItems = mergeSameProducts(groupItems)
                          return mergedGroupItems.map((item, itemIndex) => (
                            <div 
                              key={`${item.productId}-${itemIndex}`} 
                              className="pb-3"
                            >
                              {/* 상품 정보 */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  {item.brand && (
                                    <div className="text-base font-semibold text-gray-900 mb-0.5">{item.brand}</div>
                                  )}
                                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                                </div>
                                <div className="text-base font-semibold text-gray-900 ml-4">x{item.quantity}</div>
                              </div>
                            </div>
                          ))
                        })}
                        
                        {/* 일반 상품들 */}
                        {(() => {
                          const mergedStandalone = mergeSameProducts(groupedItems.standalone)
                          return mergedStandalone.map((item, index) => (
                            <div 
                              key={`${item.productId}-${index}`} 
                              className="pb-3"
                            >
                              {/* 상품 정보 */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  {item.brand && (
                                    <div className="text-base font-semibold text-gray-900 mb-0.5">{item.brand}</div>
                                  )}
                                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                                </div>
                                <div className="text-base font-semibold text-gray-900 ml-4">x{item.quantity}</div>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                      {/* 총가격 */}
                      <div className="mt-6 pt-4 border-t border-gray-300 space-y-3">
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
                        <div className="border-t pt-3">
                          <div className="flex justify-between text-lg font-bold">
                            <span>결제 예상 금액</span>
                            <span className="text-primary-900">{formatPrice(finalTotal + shipping)}원</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* 보내는 분 정보 - 선물 모드 1단계일 때만 표시 */}
              {isGiftMode && currentStep === 1 && (
                <>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">보내는 분</h2>
                      {!isEditingOrderer && (
                        <button
                          type="button"
                          onClick={() => setFlags(prev => ({ ...prev, isEditingOrderer: true }))}
                          className="px-2 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1"
                        >
                          <span>수정하기</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {!isEditingOrderer ? (
                      /* 읽기 전용 표시 */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-normal text-gray-500">이름</div>
                          <div className="text-base font-semibold text-gray-900">{formData.name || '-'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-normal text-gray-500">연락처</div>
                          <div className="text-base font-semibold text-gray-900">
                            {formData.phone ? (() => {
                              const numbers = formData.phone.replace(/[^0-9]/g, '')
                              if (numbers.length === 11) {
                                return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
                              } else if (numbers.length === 10) {
                                if (numbers.startsWith('02')) {
                                  return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
                                } else {
                                  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
                                }
                              }
                              return formData.phone
                            })() : '-'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 수정 폼 */
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
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFlags(prev => ({ ...prev, isEditingOrderer: false }))}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.name && formData.phone) {
                                setFlags(prev => ({ ...prev, isEditingOrderer: false }))
                              }
                            }}
                            className="flex-1 bg-primary-800 text-white py-2 rounded-lg font-semibold hover:bg-primary-900 transition text-sm"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 받는 분 정보 - 선물 모드일 때만 표시 */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-24">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">받는 분</h2>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={giftRecipient.name}
                          onChange={(e) => setGiftRecipient(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="받는 분 이름을 입력하세요"
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
                          value={giftRecipient.phone}
                          onChange={(e) => {
                            const numbers = e.target.value.replace(/[^0-9]/g, '')
                            setGiftRecipient(prev => ({ ...prev, phone: numbers }))
                          }}
                          placeholder="01012345678"
                          maxLength={11}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">연락처는 선물을 보내는 용도로만 사용돼요.</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-24"></div>
                </>
              )}

              {/* 주문자 정보 - 선물 모드가 아닐 때만 표시 */}
              {!isGiftMode && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">주문자</h2>
                  {!isEditingOrderer && (
                    <button
                      type="button"
                      onClick={() => setFlags(prev => ({ ...prev, isEditingOrderer: true }))}
                      className="px-2 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1"
                    >
                      <span>수정</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
                {!isEditingOrderer ? (
                  /* 읽기 전용 표시 */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-normal text-gray-500">이름</div>
                      <div className="text-base font-semibold text-gray-900">{formData.name || '-'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-normal text-gray-500">연락처</div>
                      <div className="text-base font-semibold text-gray-900">
                        {formData.phone ? (() => {
                          const numbers = formData.phone.replace(/[^0-9]/g, '')
                          if (numbers.length === 11) {
                            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
                          } else if (numbers.length === 10) {
                            if (numbers.startsWith('02')) {
                              return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
                            } else {
                              return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
                            }
                          }
                          return formData.phone
                        })() : '-'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 수정 폼 */
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFlags(prev => ({ ...prev, isEditingOrderer: false }))}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.name && formData.phone) {
                            setFlags(prev => ({ ...prev, isEditingOrderer: false }))
                          }
                        }}
                        className="flex-1 bg-primary-800 text-white py-2 rounded-lg font-semibold hover:bg-primary-900 transition text-sm"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 배송 정보 - 퀵배달일 때 표시 (선물 모드가 아닐 때만) */}
              {!isGiftMode && deliveryMethod === 'quick' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold mb-4">배송 정보</h2>
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
                    <p className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/50</p>
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

              {/* 배송 정보 - 택배배송일 때만 표시 (선물 모드가 아닐 때만) */}
              {!isGiftMode && deliveryMethod === 'regular' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold mb-4">배송 정보</h2>
                
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
                      <p className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/50</p>
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
                      <p className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/50</p>
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

              {/* 선물 옵션 - 선물 모드 2단계 */}
              {isGiftMode && currentStep === 2 && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">메시지 카드 보내기</h2>
                  </div>
                  
                  {/* 메시지 옵션 선택 */}
                  <div className="flex gap-6 mb-6">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="messageOption"
                        checked={!giftData.withMessage}
                        onChange={() => setGiftData(prev => ({ ...prev, withMessage: false }))}
                        className="w-3 h-3 text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className="text-base">메시지 없이 보내기</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="messageOption"
                        checked={giftData.withMessage}
                        onChange={() => setGiftData(prev => ({ ...prev, withMessage: true }))}
                        className="w-3 h-3 text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className="text-base">메시지 함께 보내기</span>
                    </label>
                    </div>

                  {/* 선물 메시지 카드 - 메시지 함께 보내기 선택 시에만 표시 */}
                  {giftData.withMessage && (
                  <div className="space-y-4 mb-20">
                    {/* 카드 디자인 선택 */}
                    <div>
                      <label className="block text-sm font-medium mb-3">
                        카드 디자인 선택
                      </label>
                      <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                        <div className="flex gap-3 min-w-max">
                          {[
                            { value: 'birthday', label: '생일 축하', emoji: '🎂', color: 'from-pink-200 to-pink-300' },
                            { value: 'anniversary', label: '기념일', emoji: '💝', color: 'from-orange-200 to-orange-300' },
                            { value: 'thanks', label: '감사 인사', emoji: '🙏', color: 'from-blue-200 to-blue-300' },
                            { value: 'custom', label: '커스텀', emoji: '🎁', color: 'from-purple-200 to-purple-300' },
                          ].map((design) => (
                            <button
                              key={design.value}
                              type="button"
                              onClick={() => setGiftData(prev => ({ ...prev, cardDesign: design.value as any }))}
                              className={`relative flex-shrink-0 w-32 rounded-lg border-2 transition-all ${
                                giftData.cardDesign === design.value
                                  ? 'border-primary-600 ring-2 ring-primary-300 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="aspect-[4/3] relative bg-gradient-to-br flex items-center justify-center" style={{
                                background: giftData.cardDesign === design.value
                                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                                  : design.value === 'birthday'
                                  ? 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)'
                                  : design.value === 'anniversary'
                                  ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
                                  : design.value === 'thanks'
                                  ? 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)'
                                  : 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)'
                              }}>
                                <div className="text-4xl">{design.emoji}</div>
                                {giftData.cardDesign === design.value && (
                                  <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="p-2 bg-white">
                                <p className="text-xs font-medium text-center text-gray-700">{design.label}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 카드 미리보기 */}
                    {giftData.cardDesign && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                          카드 미리보기
                        </label>
                        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-md" style={{ aspectRatio: '4/3' }}>
                          <img
                            src={`/images/gift-cards/${giftData.cardDesign}.jpg`}
                            alt="카드 디자인"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement!
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                  <span class="text-gray-400">카드 이미지를 추가해주세요</span>
                                </div>
                              `
                            }}
                          />
                          {/* 메시지 오버레이 (CSS로만 표시) */}
                          {giftData.message && (
                            <div className="absolute inset-0 flex items-center justify-center p-8">
                              <p className="text-white text-center whitespace-pre-wrap break-words drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ 
                                fontSize: 'clamp(14px, 2.5vw, 18px)',
                                lineHeight: '1.6',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)'
                              }}>
                                {giftData.message}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        선물 메시지
                      </label>
                      <textarea
                        value={giftData.message}
                        onChange={(e) => setGiftData(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        maxLength={200}
                        placeholder="받는 분께 전달할 메시지를 작성해주세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">{giftData.message.length}/200</p>
                    </div>
                  </div>
                  )}
                </div>
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">결제 방법</h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="easy" 
                      checked={paymentMethod === 'easy'}
                      onChange={() => setPaymentMethod('easy')}
                      className="w-4 h-4" 
                    />
                    <span>카드 간편 결제</span>
                  </label>
                  {paymentMethod === 'easy' && (
                    <div className="ml-7 mt-2 space-y-2">
                      {loadingCards ? (
                        <div className="text-sm text-gray-500">카드 불러오는 중...</div>
                      ) : savedCards.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => router.push('/profile/payment')}
                          className="w-full px-8 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition"
                        >
                          카드 등록하기
                        </button>
                      ) : (
                        savedCards.map((card) => (
                          <label key={card.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="selectedCard"
                              value={card.id}
                              checked={selectedCardId === card.id}
                              onChange={() => setSelectedCardId(card.id)}
                              className="w-4 h-4"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{card.card_number}</span>
                              {card.is_default && (
                                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                                  기본
                                </span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="card" 
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="w-4 h-4" 
                    />
                    <span>신용카드</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="naverpay" 
                      checked={paymentMethod === 'naverpay'}
                      onChange={() => setPaymentMethod('naverpay')}
                      className="w-4 h-4" 
                    />
                    <span>네이버 페이</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="kakaopay" 
                      checked={paymentMethod === 'kakaopay'}
                      onChange={() => setPaymentMethod('kakaopay')}
                      className="w-4 h-4" 
                    />
                    <span>카카오페이</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="tosspay" 
                      checked={paymentMethod === 'tosspay'}
                      onChange={() => setPaymentMethod('tosspay')}
                      className="w-4 h-4" 
                    />
                    <span>토스페이</span>
                  </label>
                </div>
              </div>
              )}
            </div>

            {/* 주문 요약 */}
            {isGiftFinalStep && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24 mb-20">
                <h2 className="text-xl font-bold mb-4">주문 요약</h2>
                
                {/* 배송 방법 표시 - 선물 모드가 아닐 때만 */}
                {!isGiftMode && (
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
                )}

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
                      {usedPoints > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">포인트 사용</span>
                          <span className="font-semibold text-red-600">-{formatPrice(usedPoints)}원</span>
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
                          <span>{isGiftMode ? '선물 예상 금액' : '결제 예상 금액'}</span>
                          <span className="text-primary-900">{formatPrice(finalTotal + shipping)}원</span>
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
            )}
          </div>
        </form>

        {/* 하단 고정 버튼 */}
        {mounted && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
            <div className={isGiftMode ? 'px-4 py-3' : 'px-0 pb-0'}>
              {isGiftMode && currentStep < totalGiftSteps ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleNextStep(e)
                  }}
                  className="w-full text-lg font-bold bg-red-600 text-white hover:bg-red-700 py-3 flex items-center justify-center transition"
                >
                  다음
                </button>
              ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className={`w-full text-lg font-bold transition disabled:bg-gray-400 disabled:text-gray-500 flex items-center justify-center gap-2 ${
                    isGiftMode && currentStep === totalGiftSteps
                      ? 'bg-blue-900 text-white hover:bg-blue-950 py-3'
                      : isGiftMode 
                    ? 'bg-[#FEE500] text-[#000000] hover:bg-[#FDD835] shadow-md rounded-xl py-2.5' 
                    : 'bg-blue-900 text-white hover:bg-blue-950 py-3'
                }`}
              >
                {isProcessing ? (
                  <>
                      <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${isGiftMode && currentStep === totalGiftSteps ? 'border-white' : isGiftMode ? 'border-[#000000]' : 'border-white'}`}></div>
                    처리 중...
                  </>
                ) : (
                  <>
                      {isGiftMode && currentStep === totalGiftSteps ? (
                        <span>{formatPrice(finalTotal + shipping)}원 결제하기</span>
                      ) : isGiftMode ? (
                      <>
                        <svg 
                          width="52" 
                          height="36" 
                          viewBox="0 0 60 40" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className="flex-shrink-0"
                        >
                            {/* 말풍선 본체 */}
                          <ellipse 
                            cx="30" 
                            cy="20" 
                            rx="23" 
                            ry="19" 
                            fill="#3C1E1E"
                          />
                            {/* TALK 텍스트 */}
                          <text 
                            x="30" 
                            y="21" 
                            textAnchor="middle" 
                            fontSize="13" 
                            fontWeight="600" 
                            fill="#FEE500"
                            fontFamily="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
                            letterSpacing="0.3"
                            dominantBaseline="middle"
                            transform="translate(30, 21) scale(1, 1.3) translate(-30, -21)"
                          >
                            TALK
                          </text>
                        </svg>
                        <span className="font-bold">{formatPrice(finalTotal + shipping)}원 선물하기</span>
                      </>
                    ) : (
                      <span>{formatPrice(finalTotal + shipping)}원 결제하기</span>
                    )}
                  </>
                )}
              </button>
              )}
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
                              {coupon.discount_type === 'percentage' ? (
                                <>
                                  {coupon.discount_value}% 할인
                                  {coupon.max_discount_amount && (
                                    <span className="ml-1">
                                      (최대 {formatPrice(coupon.max_discount_amount)}원)
                                    </span>
                                  )}
                                </>
                              ) : (
                                `${formatPrice(coupon.discount_value)}원 할인`
                              )}
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

