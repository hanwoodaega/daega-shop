'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { PricingResult } from '@/lib/order/pricing-types'

interface CartItemForPrice {
  productId: string
  quantity: number
  promotion_group_id?: string | null
}

type DeliveryMethod = 'pickup' | 'regular'

function buildPriceInput(
  items: CartItemForPrice[],
  deliveryMethod: DeliveryMethod,
  pickupTime: string
): object {
  const deliveryTime = deliveryMethod === 'pickup' ? pickupTime || null : null

  return {
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      promotion_group_id: item.promotion_group_id ?? null,
    })),
    delivery_type: deliveryMethod,
    delivery_time: deliveryTime,
    shipping_address: '',
    shipping_name: '',
    shipping_phone: '',
    delivery_note: null,
    used_coupon_id: null,
    used_points: 0,
    is_gift: false,
    gift_message: null,
  }
}

export function useOrderPricing(
  items: CartItemForPrice[],
  deliveryMethod: DeliveryMethod,
  pickupTime: string
) {
  const [pricing, setPricing] = useState<PricingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentKeyRef = useRef<string | null>(null)

  const inputKey = useMemo(
    () =>
      items.length === 0
        ? ''
        : JSON.stringify(buildPriceInput(items, deliveryMethod, pickupTime)),
    [items, deliveryMethod, pickupTime]
  )

  useEffect(() => {
    if (!inputKey) {
      currentKeyRef.current = null
      setPricing(null)
      setLoading(false)
      setError(null)
      return
    }

    const key = inputKey
    currentKeyRef.current = key
    const controller = new AbortController()
    let active = true

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const orderInput = JSON.parse(key) as object
        const res = await fetch('/api/orders/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderInput }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || '금액 계산 실패')
        }

        const data = await res.json()
        if (!active || currentKeyRef.current !== key) return
        setPricing(data.pricing ?? null)
      } catch (e: unknown) {
        if (!active || currentKeyRef.current !== key) return
        if (e instanceof Error && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : '금액을 불러올 수 없습니다.')
        setPricing(null)
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => {
      active = false
      controller.abort()
    }
  }, [inputKey])

  return { pricing, loading, error }
}
