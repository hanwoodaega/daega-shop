import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteSms } from '@/lib/notifications'
import crypto from 'crypto'
import { calculateOrderPricing, OrderInput, OrderItemSnapshot, PricingResult } from '@/lib/order/order-pricing.server'
import { cancelTossPayment } from '@/lib/payments/toss-server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { normalizeToOrderInput, tossConfirmBodySchema } from '@/lib/validation/schemas/order-payment'
import { sanitizePhoneDigits } from '@/lib/phone/kr'

/** draft 기준 응답: 주문은 아직 없으므로 success 페이지에서 정리 중 + 폴링 후 리다이렉트 */
function buildPendingRedirectResponse(
  orderId: string,
  payload: OrderInput,
  cartUserId: string | null
): { redirectTo: string; orderId: string; cartRemove: Array<{ productId: string; promotionGroupId?: string | null }>; cartUserId: string | null; processingPending: true } {
  const cartRemoveMap = new Map<string, { productId: string; promotionGroupId?: string | null }>()
  payload.items.forEach((item) => {
    const key = `${item.productId}::${item.promotion_group_id ?? ''}`
    if (!cartRemoveMap.has(key)) {
      cartRemoveMap.set(key, {
        productId: item.productId,
        promotionGroupId: item.promotion_group_id ?? null,
      })
    }
  })
  const cartRemove = Array.from(cartRemoveMap.values())
  const redirectTo = `/checkout/toss/success?orderId=${encodeURIComponent(orderId)}&confirmed=1`
  return { redirectTo, orderId, cartRemove, cartUserId, processingPending: true as const }
}

/** 리다이렉트용 응답 생성 (confirm 성공 시 클라이언트가 redirectTo만 쓰면 됨) */
function buildRedirectResponse(
  order: { order_number?: string | null; user_id?: string | null; recipient_phone?: string | null },
  payload: OrderInput
): { ok: true; orderNumber: string; isGuest: boolean; redirectTo: string; cartRemove: Array<{ productId: string; promotionGroupId?: string | null }> } {
  const orderNumber = order.order_number || ''
  const isGuest = !order.user_id

  let redirectTo: string
  if (isGuest) {
    const phone = sanitizePhoneDigits(String(payload.recipient_phone || ''))
    redirectTo = `/order-lookup?order_number=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}&done=1`
  } else {
    redirectTo = '/orders'
  }

  const cartRemoveMap = new Map<string, { productId: string; promotionGroupId?: string | null }>()
  payload.items.forEach((item) => {
    const key = `${item.productId}::${item.promotion_group_id ?? ''}`
    if (!cartRemoveMap.has(key)) {
      cartRemoveMap.set(key, {
        productId: item.productId,
        promotionGroupId: item.promotion_group_id ?? null,
      })
    }
  })
  const cartRemove = Array.from(cartRemoveMap.values())

  return { ok: true, orderNumber, isGuest, redirectTo, cartRemove }
}

/** 이미 확정된 주문(idempotency)용 리다이렉트 응답 (order_items 기준 cartRemove) */
function buildRedirectResponseFromOrder(
  order: { order_number?: string | null; user_id?: string | null; recipient_phone?: string | null },
  orderItems: Array<{ product_id: string }>
): { ok: true; orderNumber: string; isGuest: boolean; redirectTo: string; cartRemove: Array<{ productId: string; promotionGroupId?: string | null }> } {
  const orderNumber = order.order_number || ''
  const isGuest = !order.user_id

  let redirectTo: string
  if (isGuest) {
    const phone = sanitizePhoneDigits(String(order.recipient_phone || ''))
    redirectTo = `/order-lookup?order_number=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}&done=1`
  } else {
    redirectTo = '/orders'
  }

  const cartRemoveMap = new Map<string, { productId: string; promotionGroupId?: string | null }>()
  orderItems.forEach((item) => {
    const key = item.product_id
    if (!cartRemoveMap.has(key)) {
      cartRemoveMap.set(key, { productId: item.product_id, promotionGroupId: null })
    }
  })
  const cartRemove = Array.from(cartRemoveMap.values())

  return { ok: true, orderNumber, isGuest, redirectTo, cartRemove }
}

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

  const normalizedPhone = sanitizePhoneDigits(String(payload.recipient_phone || ''))
  const ordererName = String(payload.orderer_name || payload.recipient_name || '').trim()
  const ordererPhone = sanitizePhoneDigits(String(payload.orderer_phone || payload.recipient_phone || ''))
  const recipientName = String(payload.recipient_name || payload.orderer_name || '').trim()
  const recipientPhone = sanitizePhoneDigits(String(payload.recipient_phone || payload.orderer_phone || ''))
  const orderInsertData: Record<string, unknown> = {
    user_id: user?.id ?? null,
    order_number: orderNumber,
    total_amount: serverTotalAmount,
    tax_free_amount: serverTaxFreeAmount,
    status: 'payment_error',
    delivery_type: payload.delivery_type,
    delivery_time: payload.delivery_time,
    shipping_address: payload.shipping_address,
    orderer_name: ordererName || null,
    orderer_phone: ordererPhone || null,
    recipient_name: recipientName || null,
    recipient_phone: recipientPhone || null,
    delivery_note: payload.delivery_note,
    toss_order_id: orderId,
    toss_payment_key: paymentKey,
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

    const parsed = await parseJsonBody(request, tossConfirmBodySchema)
    if (!parsed.ok) return parsed.response
    const { paymentKey, orderId, orderInput: orderInputBody, mock } = parsed.data
    const isMock = !!mock

    // ---------- 1단계: 사전검사 (draft의 orderId 또는 레거시 orderInput)
    const hasDraftId = !!(orderId && String(orderId).trim())
    const hasLegacyInput = !!(orderInputBody && orderInputBody.items?.length)
    if ((!hasDraftId && !hasLegacyInput) || (!paymentKey && !isMock)) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    /** 비-mock 분기에서 토스 API에 넘길 결제키 (위 조건으로 존재 보장) */
    const paymentKeyForToss = !isMock ? String(paymentKey) : ''

    if (isMock && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 404 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey && !isMock) {
      return NextResponse.json({ error: '결제 설정이 없습니다.' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    let orderInput: OrderInput
    let itemSnapshots: OrderItemSnapshot[]
    let pricing: PricingResult
    let serverTotalAmount: number
    let serverTaxFreeAmount: number
    let draftIdToDelete: string | null = null
    let cartUserId: string | null = null

    // orderId가 있으면 반드시 draft만 사용. 클라이언트가 뭘 보내든 금액/상품/할인은 draft 기준만 신뢰.
    if (orderId) {
      // 1) draft 조회
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('order_drafts')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (draftError || !draft) {
        return NextResponse.json(
          { error: '주문 정보를 찾을 수 없습니다. 결제 화면에서 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      // 2) 만료된 draft 거부
      if (new Date(draft.expires_at) <= new Date()) {
        return NextResponse.json(
          { error: '주문 유효 시간이 만료되었습니다. 결제 화면에서 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      // 3) 이미 처리된 orderId (재호출/이탈 후 재진입) → 동일 응답으로 복구
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('toss_order_id', orderId)
        .maybeSingle()

      if (existingOrder) {
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('product_id')
          .eq('order_id', existingOrder.id)
            const redirectPayload = buildRedirectResponseFromOrder(existingOrder, orderItems || [])
            const res = NextResponse.json({
              success: true,
              order: existingOrder,
              ...redirectPayload,
            })
            if (redirectPayload.isGuest && existingOrder.id) {
              const cookiePayload = {
                orderId: existingOrder.id,
                createdAt: new Date().toISOString(),
              }
              res.cookies.set('guest_order_lookup', JSON.stringify(cookiePayload), {
                path: '/order-lookup',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 30,
              })
            }
            return res
      }

      // 4) draft의 amount·payload만 사용 (클라이언트 orderInput 무시)
      const pl = draft.payload as {
        orderInput: OrderInput
        itemSnapshots: OrderItemSnapshot[]
        pricing: { finalTotal: number; taxFreeAmount: number; appliedPoints: number; couponDiscount: number }
      }
      orderInput = pl.orderInput
      itemSnapshots = pl.itemSnapshots
      serverTotalAmount = draft.amount
      serverTaxFreeAmount = draft.tax_free_amount ?? 0
      draftIdToDelete = draft.id
      cartUserId = draft.user_id ?? null
      pricing = {
        originalTotal: 0,
        discountedTotal: pl.pricing.finalTotal,
        shipping: 0,
        couponDiscount: pl.pricing.couponDiscount,
        appliedPoints: pl.pricing.appliedPoints,
        finalTotal: pl.pricing.finalTotal,
        taxFreeAmount: pl.pricing.taxFreeAmount,
      }
    } else if (orderInputBody) {
      // 레거시: orderId 없이 orderInput만 전달 (draft 미사용 구간)
      const normalized = normalizeToOrderInput(orderInputBody)
      const result = await calculateOrderPricing({
        supabaseAdmin,
        userId: user?.id ?? null,
        input: normalized,
      })
      orderInput = normalized
      itemSnapshots = result.itemSnapshots
      pricing = result.pricing
      serverTotalAmount = result.pricing.finalTotal
      serverTaxFreeAmount = result.pricing.taxFreeAmount ?? 0
    } else {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    // ---------- 2단계: 외부 결제 확정 (draft amount로 토스 승인 → 승인 결과 금액이 draft와 일치할 때만 주문 생성) ----------
    if (!isMock) {
      // 토스 승인 요청: 금액은 반드시 draft.amount(serverTotalAmount)만 사용
      const confirmBody: Record<string, unknown> = {
        paymentKey: paymentKeyForToss,
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

      const responseData = (await confirmRes.json().catch(() => ({}))) as {
        code?: string
        message?: string
        totalAmount?: number
        taxFreeAmount?: number
        taxExemptionAmount?: number
        [key: string]: unknown
      }

      if (!confirmRes.ok) {
        // 이미 승인된 결제 재호출(이탈 후 재진입): 주문 있으면 성공 응답으로 복구
        const isAlreadyApproved =
          responseData?.code === 'ALREADY_PROCESSED_PAYMENT' ||
          String(responseData?.message || '').toLowerCase().includes('already') ||
          String(responseData?.message || '').toLowerCase().includes('이미')
        if (isAlreadyApproved && orderId) {
          const { data: existingOrder } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('toss_order_id', orderId)
            .maybeSingle()
          if (existingOrder) {
            const { data: orderItems } = await supabaseAdmin
              .from('order_items')
              .select('product_id')
              .eq('order_id', existingOrder.id)
            return NextResponse.json({
              success: true,
              order: existingOrder,
              ...buildRedirectResponseFromOrder(existingOrder, orderItems || []),
            })
          }
        }
        const isForbidden = confirmRes.status === 403 || responseData?.code === 'FORBIDDEN_REQUEST'
        if (isForbidden) {
          const keyPrefix = secretKey?.slice(0, 7) ?? '(없음)' // test_sk / live_sk 구분용만 로그
          console.error('[toss/confirm] 토스 승인 실패 403 (키·환경 불일치 가능)', {
            code: responseData?.code,
            message: responseData?.message,
            keyPrefix,
            orderId,
          })
          return NextResponse.json(
            {
              error:
                '결제 승인에 실패했습니다. (허용되지 않은 요청입니다.) ' +
                '테스트/실결제 환경이 일치하는지 확인해주세요. 결제창에 사용한 클라이언트 키와 서버 시크릿 키가 같은 환경(테스트 또는 실결제)이어야 합니다.',
              code: 'TOSS_FORBIDDEN',
            },
            { status: 400 }
          )
        }
        console.error('[toss/confirm] 토스 승인 실패', confirmRes.status, responseData)
        return NextResponse.json(
          { error: '결제 승인에 실패했습니다.', code: 'TOSS_CONFIRM_FAILED' },
          { status: 400 }
        )
      }

      const tossResponse = responseData
      const tossTotalAmount = Number(tossResponse?.totalAmount)
      const tossTaxFreeAmount =
        tossResponse?.taxFreeAmount != null ? Number(tossResponse.taxFreeAmount) : Number(tossResponse?.taxExemptionAmount ?? 0)

      // draft 금액과 토스 승인 결과 금액 비교 → 일치할 때만 주문 생성
      const amountMismatch =
        Number.isNaN(tossTotalAmount) ||
        tossTotalAmount !== serverTotalAmount ||
        tossTaxFreeAmount !== serverTaxFreeAmount

      if (amountMismatch) {
        const orderNumber = await createOrderWithPaymentError({
          supabaseAdmin,
          user,
          orderId: orderId ?? '',
          paymentKey: paymentKeyForToss,
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
          paymentKeyForToss,
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

    // 토스 승인 성공 직후 · 주문 생성 전: draft에 승인 결과 저장 (복구용. 실패 시 approved_not_persisted로 남음)
    if (draftIdToDelete && orderId) {
      const approvedAt = new Date().toISOString()
      await supabaseAdmin
        .from('order_drafts')
        .update({
          toss_payment_key: paymentKey || null,
          toss_approved_at: approvedAt,
          confirm_status: 'approved_not_persisted',
        })
        .eq('id', draftIdToDelete)
      // draft 경로: 후처리는 worker가 담당. 즉시 성공 응답 + worker 트리거( fire-and-forget )
      const pendingPayload = buildPendingRedirectResponse(orderId, orderInput, cartUserId)
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
        new URL(request.url).origin
      fetch(`${origin}/api/payments/toss/process-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET && { Authorization: `Bearer ${process.env.CRON_SECRET}` }),
        },
        body: JSON.stringify({ orderId: draftIdToDelete }),
      }).catch((e) => console.warn('[toss/confirm] process-draft 트리거 실패:', e))
      return NextResponse.json({
        success: true,
        ...pendingPayload,
      })
    }

    // ---------- 3단계: 레거시 경로(orderId 없이 orderInput만 전달) — 내부 확정 트랜잭션 ----------
    // 실패 시 draft는 삭제하지 않음(재시도 가능). 토스는 이미 승인된 상태일 수 있으므로 안내 메시지 반환.
    try {
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
        const payloadLegacy = orderInput
        const redirectPayload = buildRedirectResponse(existingOrder, payloadLegacy)
        const res = NextResponse.json({
          success: true,
          order: existingOrder,
          ...redirectPayload,
        })
        if (redirectPayload.isGuest && existingOrder.id) {
          const cookiePayload = {
            orderId: existingOrder.id,
            createdAt: new Date().toISOString(),
          }
          res.cookies.set('guest_order_lookup', JSON.stringify(cookiePayload), {
            path: '/api/orders/lookup',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 30,
          })
        }
        return res
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
    const normalizedPhone = sanitizePhoneDigits(String(payload.recipient_phone || ''))
    const ordererName = String(payload.orderer_name || payload.recipient_name || '').trim()
    const ordererPhone = sanitizePhoneDigits(String(payload.orderer_phone || payload.recipient_phone || ''))
    const recipientName = String(payload.recipient_name || payload.orderer_name || '').trim()
    const recipientPhone = sanitizePhoneDigits(String(payload.recipient_phone || payload.orderer_phone || ''))

    const orderInsertData: any = {
      user_id: user?.id ?? null,
      order_number: orderNumber,
      total_amount: serverTotalAmount,
      tax_free_amount: serverTaxFreeAmount,
      points_used: pricing.appliedPoints ?? 0,
      coupon_discount_amount: pricing.couponDiscount ?? 0,
      status: 'ORDER_RECEIVED',
      delivery_type: payload.delivery_type,
      delivery_time: payload.delivery_time,
      shipping_address: payload.shipping_address,
      orderer_name: ordererName || null,
      orderer_phone: ordererPhone || null,
      recipient_name: recipientName || null,
      recipient_phone: recipientPhone || null,
      delivery_note: payload.delivery_note,
    }
    orderInsertData.toss_order_id = orderId
    if (paymentKey) {
      orderInsertData.toss_payment_key = paymentKey
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

    // 2) 장바구니 삭제: draft.user_id 사용 (리다이렉트 후 쿠키 없어도 동작)
    const uid = cartUserId || user?.id
    if (uid) {
      const seen = new Map<string, { productId: string; promotionGroupId?: string | null }>()
      payload.items.forEach((item) => {
        const key = `${item.productId}::${item.promotion_group_id ?? ''}`
        if (!seen.has(key)) {
          seen.set(key, {
            productId: item.productId,
            promotionGroupId: item.promotion_group_id ?? null,
          })
        }
      })
      const pairs = Array.from(seen.values())
      for (let i = 0; i < pairs.length; i += 1) {
        const p = pairs[i]
        let query = supabaseAdmin
          .from('carts')
          .delete()
          .eq('user_id', uid)
          .eq('product_id', p.productId)
        if (p.promotionGroupId != null && p.promotionGroupId !== '') {
          query = query.eq('promotion_group_id', p.promotionGroupId)
        } else {
          query = query.is('promotion_group_id', null)
        }
        const { error: e } = await query
        if (e) console.error('[toss/confirm] 장바구니 정리 실패:', p, e)
      }
    }

    if (draftIdToDelete) {
      await supabaseAdmin.from('order_drafts').delete().eq('id', draftIdToDelete)
    }

    // ---------- 4단계: 비핵심 후처리 (알림 insert, 알림톡, 응답 반환) ----------
    if (user) {
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

    // 주문 완료 SMS 수신 번호 준비
    const orderCompletePhone = sanitizePhoneDigits(String(order?.orderer_phone ?? payload.orderer_phone ?? ''))

    const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
    const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
    const topProductName = sortedByPrice[0]?.product_name || '상품'
    const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`

    // 3) 주문 완료 SMS
    if (orderCompletePhone.length >= 10) {
      try {
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
    } else {
      console.warn('[SMS] 주문 완료 SMS 미발송: 수신 번호 부족', {
        orderNumber,
        orderCompletePhoneLength: orderCompletePhone.length,
      })
    }

    const redirectPayload = buildRedirectResponse(order, payload)
    const res = NextResponse.json({
      success: true,
      order,
      ...redirectPayload,
      cartUserId: order?.user_id ?? uid ?? null,
    })
    if (redirectPayload.isGuest && order?.id) {
      const cookiePayload = {
        orderId: order.id,
        createdAt: new Date().toISOString(),
      }
      res.cookies.set('guest_order_lookup', JSON.stringify(cookiePayload), {
        path: '/api/orders/lookup',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 30,
      })
    }
    return res
    } catch (phase3Error: unknown) {
      // 토스 승인 성공 후 주문/포인트/쿠폰/장바구니 등 DB 오류. draft는 삭제하지 않음(재시도 시 idempotency로 처리 가능)
      console.error('[toss/confirm] 주문 저장 중 오류:', phase3Error)
      return NextResponse.json(
        {
          error:
            '주문 저장 중 오류가 발생했습니다. 결제는 완료되었을 수 있습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    return unknownErrorResponse('payments/toss/confirm', error)
  }
}
