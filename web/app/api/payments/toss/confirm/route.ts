import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteAlimtalk, sendGiftNotification } from '@/lib/notifications'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'
import crypto from 'crypto'
import { calculateOrderPricing, OrderInput, OrderItemSnapshot } from '@/lib/order/order-pricing.server'
import { cancelTossPayment } from '@/lib/payments/toss-server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/** 검증 불일치 시 payment_error 상태로 주문만 저장 (감사/로그용), 포인트/쿠폰/장바구니/알림은 처리하지 않음 */
async function createOrderWithPaymentError(params: {
  supabaseAdmin: SupabaseClient
  user: User | null
  orderId: string
  paymentKey: string
  payload: OrderInput
  serverTotalAmount: number
  serverTaxFreeAmount: number
  itemSnapshots: OrderItemSnapshot[]
}): Promise<string> {
  const {
    supabaseAdmin,
    user,
    orderId,
    paymentKey,
    payload,
    serverTotalAmount,
    serverTaxFreeAmount,
    itemSnapshots,
  } = params
  const today = new Date()
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
  const orderNumber = `${datePrefix}-${suffix}`

  const normalizedPhone = String(payload.shipping_phone || '').replace(/\D/g, '').slice(0, 13)
  const orderInsertData: Record<string, unknown> = {
    user_id: user?.id ?? null,
    order_number: orderNumber,
    total_amount: serverTotalAmount,
    tax_free_amount: serverTaxFreeAmount,
    status: 'payment_error',
    delivery_type: payload.delivery_type,
    delivery_time: payload.delivery_time,
    shipping_address: payload.shipping_address,
    shipping_name: payload.shipping_name,
    shipping_phone: payload.is_gift ? '' : normalizedPhone,
    delivery_note: payload.delivery_note,
    is_gift: payload.is_gift,
    gift_message: payload.gift_message,
    payment_method: payload.payment_method || 'toss_card',
    toss_order_id: orderId,
    toss_payment_key: paymentKey,
  }
  if (payload.is_gift && payload.gift_recipient_phone) {
    orderInsertData.gift_recipient_phone = String(payload.gift_recipient_phone).replace(/\D/g, '').slice(0, 13)
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert(orderInsertData)
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[toss/confirm] payment_error 주문 저장 실패:', orderError)
    return orderNumber
  }

  const orderItems = itemSnapshots.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.final_unit_price ?? item.price,
  }))
  if (orderItems.length > 0) {
    await supabaseAdmin.from('order_items').insert(orderItems)
  }
  return orderNumber
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()

    const { paymentKey, orderId, orderInput, mock } = await request.json()
    const isMock = !!mock
    if (!orderId || !orderInput || (!paymentKey && !isMock)) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (isMock && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 404 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey && !isMock) {
      return NextResponse.json({ error: '결제 설정이 없습니다.' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user?.id ?? null,
      input: orderInput as OrderInput,
    })

    const serverTotalAmount = pricing.finalTotal
    const serverTaxFreeAmount = pricing.taxFreeAmount ?? 0

    if (!isMock) {
      const confirmBody: Record<string, unknown> = {
        paymentKey,
        orderId,
        amount: serverTotalAmount,
      }
      if (serverTaxFreeAmount > 0) {
        confirmBody.taxFreeAmount = serverTaxFreeAmount
      }

      const auth = Buffer.from(`${secretKey}:`).toString('base64')
      const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmBody),
      })

      if (!confirmRes.ok) {
        const errorData = await confirmRes.json().catch(() => ({}))
        return NextResponse.json(
          { error: '결제 승인에 실패했습니다.', details: errorData },
          { status: 400 }
        )
      }

      const tossResponse = await confirmRes.json() as {
        totalAmount?: number
        taxFreeAmount?: number
        taxExemptionAmount?: number
        [key: string]: unknown
      }
      const tossTotalAmount = Number(tossResponse?.totalAmount)
      const tossTaxFreeAmount =
        tossResponse?.taxFreeAmount != null ? Number(tossResponse.taxFreeAmount) : Number(tossResponse?.taxExemptionAmount ?? 0)

      // 총액·면세액 모두 일치해야 통과 (복합과세 상점)
      const amountMismatch =
        Number.isNaN(tossTotalAmount) ||
        tossTotalAmount !== serverTotalAmount ||
        tossTaxFreeAmount !== serverTaxFreeAmount

      if (amountMismatch) {
        const orderNumber = await createOrderWithPaymentError({
          supabaseAdmin,
          user,
          orderId,
          paymentKey,
          payload: orderInput as OrderInput,
          serverTotalAmount,
          serverTaxFreeAmount,
          itemSnapshots,
        })

        console.error('[toss/confirm] 결제 검증 불일치', {
          orderNumber,
          orderId,
          userId: user?.id ?? 'guest',
          serverTotalAmount,
          serverTaxFreeAmount,
          tossTotalAmount: tossResponse?.totalAmount,
          tossTaxFreeAmount: tossResponse?.taxFreeAmount,
          payload: JSON.stringify(tossResponse).slice(0, 500),
        })

        const cancelResult = await cancelTossPayment(
          paymentKey,
          '결제 검증 불일치로 자동 취소(금액 불일치)'
        )
        if (!cancelResult.ok) {
          console.error('[toss/confirm] 검증 실패 후 토스 취소 실패:', cancelResult.error)
        }

        return NextResponse.json(
          { error: '결제 검증 중 오류가 발생했습니다. 결제는 취소되었습니다. 다시 시도해 주세요.' },
          { status: 400 }
        )
      }
    }

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
    const normalizedPhone = String(payload.shipping_phone || '').replace(/\D/g, '').slice(0, 13)

    const giftToken = payload.is_gift ? crypto.randomBytes(32).toString('hex') : null
    const giftExpiresAt = payload.is_gift ? getGiftExpiresAtEndOfDayKST() : null

    const orderInsertData: any = {
      user_id: user?.id ?? null,
      order_number: orderNumber,
      total_amount: pricing.finalTotal,
      tax_free_amount: serverTaxFreeAmount,
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
    if (paymentKey) {
      orderInsertData.toss_payment_key = paymentKey
    }

    if (payload.is_gift) {
      orderInsertData.gift_token = giftToken
      orderInsertData.gift_expires_at = giftExpiresAt
      if (payload.gift_recipient_phone) {
        orderInsertData.gift_recipient_phone = String(payload.gift_recipient_phone).replace(/\D/g, '').slice(0, 13)
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 })
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
        return NextResponse.json({ error: '주문 상품 저장 실패' }, { status: 500 })
      }
    }

    // 1) 핵심 정합성: 포인트·쿠폰은 주문과 강하게 결합 → 순차 처리, 실패 시 일관성 유지
    if (user && pricing.appliedPoints > 0) {
      const pointsOk = await usePoints(
        user.id,
        pricing.appliedPoints,
        order.id,
        `주문 #${orderNumber} 포인트 사용`,
        supabaseAdmin
      )
      if (!pointsOk) {
        console.error('[toss/confirm] 포인트 사용 처리 실패')
        return NextResponse.json({ error: '포인트 사용 처리에 실패했습니다.' }, { status: 500 })
      }
    }
    if (user && payload.used_coupon_id && pricing.couponDiscount > 0) {
      const { error: couponError } = await supabaseAdmin
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          order_id: order.id,
        })
        .eq('id', payload.used_coupon_id)
        .eq('user_id', user.id)
      if (couponError) {
        console.error('[toss/confirm] 쿠폰 사용 처리 실패:', couponError)
        return NextResponse.json({ error: '쿠폰 사용 처리에 실패했습니다.' }, { status: 500 })
      }
    }

    // 2) 장바구니 삭제: 한 번의 delete로 처리 (user_id + (product_id, promotion_group_id) 조합)
    if (user) {
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
      const pairs = Array.from(deleteTargets.values())
      if (pairs.length > 0) {
        const orParts = pairs.map(
          (p) =>
            `and(product_id.eq.${p.productId},promotion_group_id.${p.promotionGroupId ? `eq.${p.promotionGroupId}` : 'is.null'})`
        )
        const { error: cartError } = await supabaseAdmin
          .from('carts')
          .delete()
          .eq('user_id', user.id)
          .or(orParts.join(','))
        if (cartError) {
          console.error('[toss/confirm] 장바구니 정리 실패:', cartError)
        }
      }

      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: user.id,
          title: '주문이 완료되었습니다.',
          content: `주문번호 ${orderNumber}의 결제가 완료되었습니다.`,
          type: 'general',
          is_read: false,
          order_id: order.id,
        })
      } catch (e) {
        console.error('[toss/confirm] 알림 생성 실패:', e)
      }
    }

    // 주문 완료 알림톡 수신 번호·선물용 baseUrl(선물일 때만 사용) 미리 준비
    const orderCompletePhone = payload.is_gift
      ? String(payload.orderer_phone ?? '').replace(/\D/g, '').slice(0, 13)
      : normalizedPhone
    let giftBaseUrl: string | null = null
    if (payload.is_gift && payload.gift_recipient_phone) {
      giftBaseUrl = (await getServerBaseUrl()) || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    }

    const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
    const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
    const topProductName = sortedByPrice[0]?.product_name || '상품'
    const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`

    // 3) 알림톡: 서버리스에서 응답 후 작업이 보장되지 않으므로 await 후 반환 (누락 방지)
    if (orderCompletePhone.length >= 10) {
      try {
        const result = await sendOrderCompleteAlimtalk({
          to: orderCompletePhone,
          orderNumber,
          productName,
        })
        if (!result.success) {
          console.error('[Alimtalk] 주문 완료 알림톡 발송 실패 (SMS fallback은 알리고에서 처리):', result.detail)
        }
      } catch (e) {
        console.error('주문 완료 알림톡 발송 실패:', e)
      }
    }
    if (payload.is_gift && giftToken && payload.gift_recipient_phone && giftExpiresAt && giftBaseUrl) {
      try {
        const receiveUrl = `${giftBaseUrl.replace(/\/$/, '')}/gift/receive/${giftToken}`
        const senderName = (payload.gift_sender_name || payload.shipping_name || '보내는 분').trim() || '보내는 분'
        const d = new Date(giftExpiresAt)
        const expiresAtFormatted = `${d.getMonth() + 1}월 ${d.getDate()}일`
        await sendGiftNotification({
          to: payload.gift_recipient_phone,
          senderName,
          message: payload.gift_message ?? null,
          productName,
          token: giftToken,
          receiveUrl,
          expiresAtFormatted,
        })
      } catch (e) {
        console.error('선물 알림톡 발송 실패:', e)
      }
    }

    return NextResponse.json({ success: true, order, gift_token: giftToken })
  } catch (error: any) {
    console.error('결제 승인 처리 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
