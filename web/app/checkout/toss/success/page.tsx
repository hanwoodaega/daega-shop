'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { removeFromCartDB } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'
import { initKakaoSDK } from '@/lib/order/gift/initKakao'
import { shareGiftToKakao } from '@/lib/order/gift/kakaoShare'

interface CheckoutMeta {
  isDirectPurchase: boolean
  isGiftMode: boolean
  saveAsDefaultAddress: boolean
  deliveryMethod: string
  giftData?: {
    message: string
    cardDesign: string
  }
  formData: {
    name: string
    phone: string
    email: string
    address: string
    addressDetail: string
    zipcode: string
    message: string
  }
  items: Array<{
    id?: string
    productId: string
    quantity: number
    price: number
    promotion_group_id?: string
  }>
  orderInput: {
    delivery_type: string
    delivery_time: string | null
    shipping_address: string
    shipping_name: string
    shipping_phone: string
    delivery_note: string | null
    used_coupon_id: string | null
    used_points: number
    is_gift: boolean
    gift_message: string | null
    gift_card_design: string | null
    items: Array<{
      productId: string
      quantity: number
      promotion_group_id?: string | null
    }>
  }
}

function TossSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const removeSelectedFromCart = useCartStore((state) => state.removeSelectedItems)
  const clearDirectPurchase = useDirectPurchaseStore((state) => state.clearItems)
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('결제 승인 중입니다...')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')
    const isMock = searchParams.get('mock') === '1'

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setMessage('결제 승인 정보가 없습니다.')
      return
    }

    const metaKey = `toss_checkout_${orderId}`
    const rawMeta = sessionStorage.getItem(metaKey)
    if (!rawMeta) {
      setStatus('error')
      setMessage('결제 정보를 찾을 수 없습니다. 다시 시도해주세요.')
      return
    }

    const meta: CheckoutMeta = JSON.parse(rawMeta)

    const confirmPayment = async () => {
      try {
        if (isMock) {
          const mockRes = await fetch('/api/payments/toss/mock-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              amount: Number(amount),
              orderInput: meta.orderInput,
            }),
          })

          if (!mockRes.ok) {
            const errorData = await mockRes.json().catch(() => ({}))
            console.error('mock-confirm error:', errorData)
            throw new Error(errorData.error || '결제 승인에 실패했습니다.')
          }

          const data = await mockRes.json()

          await saveAddressIfNeeded(meta)
          await cleanupCart(meta)

          if (meta.isGiftMode && data?.gift_token) {
            initKakaoSDK()
            await shareGiftToKakao({
              orderId: data.order?.id,
              giftToken: data.gift_token,
              cardDesign: meta.giftData?.cardDesign || 'birthday-1',
              message: meta.giftData?.message || '',
              items: meta.items.map((item) => ({ imageUrl: undefined })),
            })
          }

          sessionStorage.removeItem(metaKey)
          setStatus('success')
          setMessage('결제가 완료되었습니다. (테스트)')

          const redirectUrl = meta.isGiftMode && data?.gift_token
            ? `/orders?giftToken=${data.gift_token}`
            : '/orders'
          window.setTimeout(() => router.replace(redirectUrl), 1200)
          return
        }

        const res = await fetch('/api/payments/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            orderInput: meta.orderInput,
            mock: searchParams.get('mock') === '1',
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || '결제 승인에 실패했습니다.')
        }

        const data = await res.json()

        await saveAddressIfNeeded(meta)
        await cleanupCart(meta)

        if (meta.isGiftMode && data?.gift_token) {
          initKakaoSDK()
          await shareGiftToKakao({
            orderId: data.order?.id,
            giftToken: data.gift_token,
            cardDesign: meta.giftData?.cardDesign || 'birthday-1',
            message: meta.giftData?.message || '',
            items: meta.items.map((item) => ({ imageUrl: undefined })),
          })
        }

        sessionStorage.removeItem(metaKey)

        setStatus('success')
        setMessage('결제가 완료되었습니다. 주문 페이지로 이동합니다.')

        const redirectUrl = meta.isGiftMode && data?.gift_token
          ? `/orders?giftToken=${data.gift_token}`
          : '/orders'
        window.setTimeout(() => router.replace(redirectUrl), 1200)
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || '결제 승인에 실패했습니다.')
      }
    }

    confirmPayment()
  }, [router, searchParams, removeSelectedFromCart, clearDirectPurchase, user])

  const saveAddressIfNeeded = async (meta: CheckoutMeta) => {
    if (!meta.saveAsDefaultAddress || !meta.formData.address) return
    if (meta.deliveryMethod !== 'regular' && meta.deliveryMethod !== 'quick') return

    try {
      const checkRes = await fetch('/api/addresses/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: meta.formData.address.trim(),
          address_detail: (meta.formData.addressDetail || '').trim() || null,
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
            recipient_name: meta.formData.name,
            recipient_phone: meta.formData.phone,
            zipcode: meta.formData.zipcode || null,
            address: meta.formData.address,
            address_detail: meta.formData.addressDetail || null,
            delivery_note: meta.formData.message || null,
            is_default: true,
          }),
        })
      } else {
        const addressName = meta.deliveryMethod === 'quick'
          ? `퀵배달 주소 ${addressCount}`
          : addressCount === 1
            ? '기본 배송지'
            : `배송지 ${addressCount}`

        await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addressName,
            recipient_name: meta.formData.name,
            recipient_phone: meta.formData.phone,
            zipcode: meta.formData.zipcode || null,
            address: meta.formData.address,
            address_detail: meta.formData.addressDetail || null,
            delivery_note: meta.formData.message || null,
            is_default: true,
          }),
        })
      }
    } catch (error) {
      // 배송지 저장 실패는 무시
    }
  }

  const cleanupCart = async (meta: CheckoutMeta) => {
    if (meta.isDirectPurchase) {
      clearDirectPurchase()
      return
    }

    try {
      if (user?.id) {
        const handledGroups = new Set<string>()
        for (const it of meta.items) {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">토스페이먼츠 결제</h1>
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
          {message}
        </p>
      </div>
    </div>
  )
}

export default function TossSuccessPage() {
  return (
    <Suspense fallback={null}>
      <TossSuccessContent />
    </Suspense>
  )
}
