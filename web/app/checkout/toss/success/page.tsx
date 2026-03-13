'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore, useDirectPurchaseStore } from '@/lib/store'
import { loadCartFromDB, setCartItems } from '@/lib/cart/cart-db'
import { useAuth } from '@/lib/auth/auth-context'
import { mutateProfileRelated, mutateAddresses, mutateOrders, mutateUnreadCount } from '@/lib/swr'

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

function TossSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const clearDirectPurchase = useDirectPurchaseStore((state) => state.clearItems)
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const confirmStartedRef = useRef(false)

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const isMock = searchParams.get('mock') === '1'

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
          const detailMsg = data.details?.message || data.details?.code
          const fullMsg = data.error + (detailMsg ? ` (${detailMsg})` : '')
          throw new Error(fullMsg || '결제 승인에 실패했습니다.')
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

          const refreshUserId = data.cartUserId ?? user?.id
          if (refreshUserId) {
            try {
              const freshItems = await loadCartFromDB(refreshUserId)
              setCartItems(freshItems, 'paymentSuccess')
            } catch {
              // 장바구니 갱신 실패해도 주문 완료는 유지
            }
          } else if (data.cartRemove?.length) {
            // 비회원: DB 장바구니 없음 → 스토어에서 결제한 상품만 제거
            const removeSet = new Set(
              data.cartRemove.map((x: { productId: string; promotionGroupId?: string | null }) => `${x.productId}::${x.promotionGroupId ?? ''}`)
            )
            const current = useCartStore.getState().items
            const filtered = current.filter(
              (item) => !removeSet.has(`${item.productId}::${item.promotion_group_id ?? ''}`)
            )
            setCartItems(filtered, 'paymentSuccess')
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
    <div className="min-h-screen flex items-center justify-center px-4">
      {status === 'processing' && (
        <p className="text-sm text-gray-500">결제 확인 중...</p>
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
