'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { removeFromCartDB, setCartItems } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'

interface CheckoutMeta {
  isDirectPurchase: boolean
  isGiftMode: boolean
  saveAsDefaultAddress: boolean
  deliveryMethod: string
  giftData?: {
    message: string
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
  const [message, setMessage] = useState('')
  const [successMeta, setSuccessMeta] = useState<{ isGift?: boolean; giftToken?: string } | null>(null)
  const confirmStartedRef = useRef(false)

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

    if (confirmStartedRef.current) return
    confirmStartedRef.current = true

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

          sessionStorage.removeItem(metaKey)
          setStatus('success')
          setSuccessMeta(meta.isGiftMode && data?.gift_token ? { isGift: true, giftToken: data.gift_token } : null)

          const isGuestOrder = data?.order && data.order.user_id == null
          const redirectUrl = meta.isGiftMode && data?.gift_token
            ? `/orders?giftToken=${data.gift_token}`
            : isGuestOrder
              ? `/order-lookup?order_number=${encodeURIComponent(data.order?.order_number ?? '')}&phone=${encodeURIComponent(meta.orderInput?.shipping_phone ?? '')}&done=1`
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

        sessionStorage.removeItem(metaKey)

        setStatus('success')
        setSuccessMeta(meta.isGiftMode && data?.gift_token ? { isGift: true, giftToken: data.gift_token } : null)

        const isGuestOrder = data?.order && data.order.user_id == null
        const redirectUrl = meta.isGiftMode && data?.gift_token
          ? `/orders?giftToken=${data.gift_token}`
          : isGuestOrder
            ? `/order-lookup?order_number=${encodeURIComponent(data.order?.order_number ?? '')}&phone=${encodeURIComponent(meta.orderInput?.shipping_phone ?? '')}&done=1`
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

    const itemsByKey = new Map<string, { productId: string; promotionGroupId?: string | null }>()
    meta.items.forEach((it) => {
      const key = `${it.productId}::${it.promotion_group_id ?? ''}`
      if (!itemsByKey.has(key)) {
        itemsByKey.set(key, { productId: it.productId, promotionGroupId: it.promotion_group_id })
      }
    })

    try {
      if (user?.id) {
        await Promise.all(
          Array.from(itemsByKey.values()).map(({ productId, promotionGroupId }) =>
            removeFromCartDB(user.id, {
              productId,
              promotionGroupId: promotionGroupId ?? undefined,
            })
          )
        )
      }
    } catch (err) {
      // DB 삭제 실패해도 UI는 진행
    }

    // 선택 여부와 관계없이 결제된 상품은 로컬에서 제거
    const currentItems = useCartStore.getState().items
    const filtered = currentItems.filter((item) => {
      const key = `${item.productId}::${item.promotion_group_id ?? ''}`
      return !itemsByKey.has(key)
    })
    setCartItems(filtered, 'paymentSuccess')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {status === 'success' && (
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
          <p className="text-lg font-medium text-gray-800 mb-2">결제가 완료되었습니다.</p>
          {successMeta?.isGift && (
            <p className="text-sm text-gray-600 mb-2">
              선물 알림이 받는 분 휴대폰으로 발송되었습니다.
            </p>
          )}
          <p className="text-xs text-gray-500">잠시 후 이동합니다...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-red-600">{message || '결제 승인에 실패했습니다.'}</p>
        </div>
      )}
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
