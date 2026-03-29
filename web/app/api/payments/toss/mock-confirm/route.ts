import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteSms } from '@/lib/notifications'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'
import crypto from 'crypto'
import { calculateOrderPricing, type OrderInput } from '@/lib/order/order-pricing.server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { mockConfirmBodySchema, normalizeToOrderInput } from '@/lib/validation/schemas/order-payment'
import { sanitizePhoneDigits } from '@/lib/phone/kr'

export async function POST(request: NextRequest) {
  const allowMockInProd =
    process.env.NEXT_PUBLIC_TOSS_MOCK === 'true' || process.env.TOSS_ALLOW_MOCK === 'true'
  if (process.env.NODE_ENV === 'production' && !allowMockInProd) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase 설정이 없습니다.' },
        { status: 500 }
      )
    }

    const user = await getUserFromServer()

    const parsed = await parseJsonBody(request, mockConfirmBodySchema)
    if (!parsed.ok) return parsed.response
    const { orderId, orderInput: rawOrderInput } = parsed.data
    const orderInput = normalizeToOrderInput(rawOrderInput)

    const supabaseAdmin = createSupabaseAdminClient()
    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user?.id ?? null,
      input: orderInput,
    })

    const today = new Date()
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const sanitizedOrderId = String(orderId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const idempotencySuffix = sanitizedOrderId.slice(0, 4)
    const idempotentOrderNumber = idempotencySuffix ? `${datePrefix}-${idempotencySuffix}` : null

    if (idempotentOrderNumber) {
      let existingQuery = supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_number', idempotentOrderNumber)
      if (user) {
        existingQuery = existingQuery.eq('user_id', user.id)
      } else {
        existingQuery = existingQuery.is('user_id', null)
      }
      const { data: existingOrder } = await existingQuery.maybeSingle()
      if (existingOrder) {
        const giftToken = existingOrder.gift_token ?? null
        return NextResponse.json({ success: true, order: existingOrder, gift_token: giftToken })
      }
    }

    let orderNumber = idempotentOrderNumber ?? ''
    if (!orderNumber) {
      for (let i = 0; i < 5; i += 1) {
        const suffix = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
        const candidate = `${datePrefix}-${suffix}`
        const { data: exists } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('order_number', candidate)
          .maybeSingle()
        if (!exists) {
          orderNumber = candidate
          break
        }
      }
    }
    if (!orderNumber) {
      return NextResponse.json({ error: '주문번호 생성에 실패했습니다.' }, { status: 500 })
    }

    const payload: OrderInput = orderInput
    const normalizedPhone = sanitizePhoneDigits(String(payload.shipping_phone || ''))
    const giftToken = payload.is_gift ? crypto.randomBytes(32).toString('hex') : null
    const giftExpiresAt = payload.is_gift ? getGiftExpiresAtEndOfDayKST() : null

    const orderInsertData: any = {
      user_id: user?.id ?? null,
      order_number: orderNumber,
      total_amount: pricing.finalTotal,
      tax_free_amount: pricing.taxFreeAmount ?? 0,
      points_used: pricing.appliedPoints ?? 0,
      coupon_discount_amount: pricing.couponDiscount ?? 0,
      status: 'ORDER_RECEIVED',
      delivery_type: payload.delivery_type,
      delivery_time: payload.delivery_time,
      shipping_address: payload.shipping_address,
      shipping_name: payload.shipping_name,
      shipping_phone: payload.is_gift ? '' : normalizedPhone,
      delivery_note: payload.delivery_note,
      is_gift: payload.is_gift,
      gift_message: payload.gift_message,
      payment_method: payload.payment_method || 'toss_card',
    }
    orderInsertData.toss_order_id = orderId
    orderInsertData.toss_payment_key = `MOCK_${orderId}`

    if (payload.is_gift) {
      orderInsertData.gift_token = giftToken
      orderInsertData.gift_expires_at = giftExpiresAt
      if (payload.gift_recipient_phone) {
        orderInsertData.gift_recipient_phone = sanitizePhoneDigits(String(payload.gift_recipient_phone))
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      return dbErrorResponse('[mock-confirm] orders insert', orderError ?? new Error('no order'))
    }

    const orderItems = itemSnapshots.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.final_unit_price ?? item.price,
    }))

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        return dbErrorResponse('[mock-confirm] order_items insert', itemsError)
      }
    }

    if (user && pricing.appliedPoints > 0) {
      await usePoints(
        user.id,
        pricing.appliedPoints,
        order.id,
        `주문 #${orderNumber} 포인트 사용`,
        supabaseAdmin
      )
    }

    if (user && payload.used_coupon_id && pricing.couponDiscount > 0) {
      await supabaseAdmin
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          order_id: order.id,
        })
        .eq('id', payload.used_coupon_id)
        .eq('user_id', user.id)
    }

    if (user) {
      try {
        const deleteTargets = new Map<string, { productId: string; promotionGroupId?: string | null }>()
        payload.items.forEach((item) => {
          const key = `${item.productId}::${item.promotion_group_id ?? ''}`
          if (!deleteTargets.has(key)) {
            deleteTargets.set(key, {
              productId: item.productId,
              promotionGroupId: item.promotion_group_id ?? null,
            })
          }
        })

        for (const target of Array.from(deleteTargets.values())) {
          let query = supabaseAdmin
            .from('carts')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', target.productId)

          if (target.promotionGroupId) {
            query = query.eq('promotion_group_id', target.promotionGroupId)
          } else {
            query = query.is('promotion_group_id', null)
          }

          await query
        }
      } catch (e) {
        console.error('장바구니 정리 실패:', e)
      }
    }

    // 주문 완료 SMS (선물이면 주문자 연락처로, 아니면 수령인 연락처로 발송)
    const orderCompletePhone = payload.is_gift
      ? sanitizePhoneDigits(String(payload.orderer_phone ?? ''))
      : (() => {
          const fromPayload = sanitizePhoneDigits(String(payload.shipping_phone || ''))
          if (fromPayload.length >= 10) return fromPayload
          const fromOrder = sanitizePhoneDigits(String(order?.shipping_phone ?? ''))
          return fromOrder.length >= 10 ? fromOrder : fromPayload
        })()
    if (orderCompletePhone.length >= 10) {
      try {
        const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
        const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
        const topProductName = sortedByPrice[0]?.product_name || '상품'
        const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`
        const result = await sendOrderCompleteSms({
          phone: orderCompletePhone,
          orderNumber,
        })
        if (!result.success) {
          console.error('[SMS] 주문 완료 발송 실패:', result.detail)
        }
      } catch (e) {
        console.error('주문 완료 SMS 발송 실패:', e)
      }
    }

    return NextResponse.json({ success: true, order, gift_token: giftToken })
  } catch (error: unknown) {
    return unknownErrorResponse('payments/toss/mock-confirm', error)
  }
}
