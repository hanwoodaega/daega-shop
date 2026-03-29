'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { loadCartFromDB, setCartItems } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'
import { mutateProfileRelated, mutateAddresses, mutateOrders, mutateUnreadCount } from '@/lib/swr'
import { sanitizePhoneDigits } from '@/lib/phone/kr'

/** sessionStorage용 메타 (배송지 저장 등 부가 처리만, confirm은 서버 draft 기준) */
interface CheckoutMeta {
  isDirectPurchase?: boolean
  isGiftMode?: boolean
  saveAsDefaultAddress?: boolean
  deliveryMethod?: string
  formData?: {
    name: string
    phone: string
    address?: string
    addressDetail?: string
    zipcode?: string
    message?: string
  }
  orderInput?: { shipping_phone?: string }
}

const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 60 // ~90초

function buildFinalRedirect(order: {
  order_number: string | null
  user_id: string | null
  gift_token: string | null
  shipping_phone: string | null
}): string {
  if (order.gift_token) {
    return `/orders?giftToken=${encodeURIComponent(order.gift_token)}`
  }
  if (!order.user_id) {
    const phone = sanitizePhoneDigits(String(order.shipping_phone || ''))
    return `/order-lookup?order_number=${encodeURIComponent(order.order_number || '')}&phone=${encodeURIComponent(phone)}&done=1`
  }
  return '/orders'
}

function TossSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const clearDirectPurchase = useDirectPurchaseStore((state) => state.clearItems)
  const [status, setStatus] = useState<'processing' | 'pending' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const confirmStartedRef = useRef(false)
  const pendingOrderIdRef = useRef<string | null>(null)

  // confirmed=1 + orderId 있을 때 주문 폴링 (worker 완료 대기)
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    const confirmed = searchParams.get('confirmed') === '1'
    if (status !== 'pending' || !confirmed || !orderId) return

    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      if (attempts > POLL_MAX_ATTEMPTS) {
        clearInterval(timer)
        setStatus('error')
        setMessage('주문 처리 시간이 초과되었습니다. 주문조회 또는 마이페이지에서 확인해 주세요.')
        return
      }
      try {
        const res = await fetch(`/api/orders/by-toss-order-id?orderId=${encodeURIComponent(orderId)}`)
        if (res.ok) {
          const data = await res.json()
          clearInterval(timer)
          const finalRedirect = buildFinalRedirect(data.order)
          mutateOrders().catch(() => {})
          router.replace(finalRedirect)
          return
        }
      } catch {
        // 다음 폴링까지 대기
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [status, searchParams, router])

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const confirmed = searchParams.get('confirmed') === '1'
    const isMock = searchParams.get('mock') === '1'

    // 이미 정리 중 페이지로 리다이렉트된 상태(confirmed=1, orderId만 있음) → confirm 재호출 없이 폴링만
    if (confirmed && orderId && !paymentKey) {
      pendingOrderIdRef.current = orderId
      setStatus('pending')
      setMessage('주문 정보 처리중입니다.')
      return
    }

    if (!paymentKey || !orderId) {
      setStatus('error')
      setMessage('결제 승인 정보가 없습니다.')
      return
    }

    if (confirmStartedRef.current) return
    confirmStartedRef.current = true

    const metaKey = `toss_checkout_${orderId}`
    const rawMeta = sessionStorage.getItem(metaKey)
    let meta: CheckoutMeta | null = null
    if (rawMeta) {
      try {
        meta = JSON.parse(rawMeta) as CheckoutMeta
      } catch {
        meta = null
      }
    }

    const confirmPayment = async () => {
      try {
        const res = await fetch('/api/payments/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paymentKey,
            orderId,
            mock: isMock,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          const detailMsg =
            typeof data.detail === 'string'
              ? data.detail
              : data.details?.message || data.details?.code
          const parts = [data.error, detailMsg].filter(Boolean)
          throw new Error(parts.join(' — ') || '결제 승인에 실패했습니다.')
        }

        if (data.redirectTo) {
          if (meta?.saveAsDefaultAddress && meta?.formData?.address && (meta.deliveryMethod === 'regular' || meta.deliveryMethod === 'quick')) {
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
              const fd = meta.formData!

              if (existing) {
                await fetch(`/api/addresses/${existing.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: existing.name,
                    recipient_name: fd.name,
                    recipient_phone: fd.phone,
                    zipcode: fd.zipcode || null,
                    address: fd.address,
                    address_detail: fd.addressDetail || null,
                    delivery_note: fd.message || null,
                    is_default: true,
                  }),
                })
              } else {
                const addressName = meta.deliveryMethod === 'quick'
                  ? `퀵배달 주소 ${addressCount}`
                  : addressCount === 1 ? '기본 배송지' : `배송지 ${addressCount}`
                await fetch('/api/addresses', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: addressName,
                    recipient_name: fd.name,
                    recipient_phone: fd.phone,
                    zipcode: fd.zipcode || null,
                    address: fd.address,
                    address_detail: fd.addressDetail || null,
                    delivery_note: fd.message || null,
                    is_default: true,
                  }),
                })
              }
            } catch {
              // 배송지 저장 실패는 주문 성공과 분리
            }
          }

          if (data.cartRemove?.length) {
            const removeSet = new Set(
              data.cartRemove.map((x: { productId: string; promotionGroupId?: string | null }) => `${x.productId}::${x.promotionGroupId ?? ''}`)
            )
            const current = useCartStore.getState().items
            const filtered = current.filter(
              (item) => !removeSet.has(`${item.productId}::${item.promotion_group_id ?? ''}`)
            )
            setCartItems(filtered, 'paymentSuccess')
          }

          if (!data.processingPending) {
            const refreshUserId = data.cartUserId ?? user?.id
            if (refreshUserId) {
              try {
                const freshItems = await loadCartFromDB(refreshUserId)
                setCartItems(freshItems, 'paymentSuccess')
              } catch {
                // 장바구니 갱신 실패해도 주문 완료는 유지
              }
            }
          }

          if (meta?.isDirectPurchase) {
            clearDirectPurchase()
          }
        }

        sessionStorage.removeItem(metaKey)
        mutateProfileRelated().catch(() => {})
        mutateAddresses().catch(() => {})
        mutateOrders().catch(() => {})
        mutateUnreadCount().catch(() => {})

        if (data.processingPending && data.orderId) {
          pendingOrderIdRef.current = data.orderId
          setStatus('pending')
          setMessage('주문 정보 처리중입니다.')
          router.replace(data.redirectTo || `/checkout/toss/success?orderId=${encodeURIComponent(data.orderId)}&confirmed=1`)
          return
        }

        if (data.redirectTo) {
          router.replace(data.redirectTo)
        } else {
          router.replace('/orders')
        }
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || '결제 승인에 실패했습니다.')
      }
    }

    confirmPayment()
  }, [router, searchParams, user, clearDirectPurchase])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      {status === 'processing' && (
        <>
          <div
            className="w-12 h-12 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin"
            aria-hidden
          />
          <p className="text-lg font-medium text-gray-700">결제 확인 중...</p>
        </>
      )}
      {status === 'pending' && (
        <>
          <div
            className="w-12 h-12 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin"
            aria-hidden
          />
          <p className="text-lg font-medium text-gray-700">{message}</p>
        </>
      )}
      {status === 'error' && (
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-red-600">{message || '결제 승인에 실패했습니다.'}</p>
          <p className="text-xs text-gray-500 mt-2">
            주문/결제 내역은 주문조회 또는 마이페이지에서 확인할 수 있습니다.
          </p>
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
