/**
 * draft(approved_not_persisted) → orders/order_items/포인트/쿠폰/장바구니/알림 처리
 * confirm API는 토스 승인 + draft 상태만 담당하고, 이 로직은 process-draft 엔드포인트에서 실행.
 */

import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteSms } from '@/lib/notifications'
import type { OrderInput, OrderItemSnapshot, PricingResult } from '@/lib/order/order-pricing.server'
import { sanitizePhoneDigits } from '@/lib/phone/kr'

const CONFIRM_STATUS = {
  APPROVED_NOT_PERSISTED: 'approved_not_persisted',
  PERSISTING: 'persisting',
  DONE: 'done',
  FAILED: 'failed',
} as const

export interface PersistResult {
  ok: boolean
  order?: {
    id: string
    order_number: string | null
    user_id: string | null
    recipient_phone: string | null
    [key: string]: unknown
  }
  error?: string
}

/**
 * approved_not_persisted 상태인 draft 한 건을 주문으로 확정.
 * - 이미 order가 있으면 idempotency: draft만 done 처리 후 성공 반환.
 * - 실패 시 draft.confirm_status = 'failed'
 */
export async function persistDraftToOrder(draftId: string): Promise<PersistResult> {
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('order_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()

  if (draftError || !draft) {
    return { ok: false, error: 'draft_not_found' }
  }

  const isRetryable =
    draft.confirm_status === CONFIRM_STATUS.APPROVED_NOT_PERSISTED ||
    draft.confirm_status === CONFIRM_STATUS.FAILED

  if (!isRetryable) {
    // 이미 처리 중이거나 완료 → order 있는지 확인 후 성공 처리
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, user_id, recipient_phone')
      .eq('toss_order_id', draftId)
      .maybeSingle()
    if (existingOrder) {
      return { ok: true, order: existingOrder }
    }
    if (draft.confirm_status === CONFIRM_STATUS.DONE) {
      return { ok: true }
    }
    if (draft.confirm_status === CONFIRM_STATUS.PERSISTING) {
      return { ok: false, error: 'already_processing' }
    }
    return { ok: false, error: `invalid_status: ${draft.confirm_status}` }
  }

  const orderId = draft.id
  const paymentKey = draft.toss_payment_key

  // idempotency: 이미 order 있으면 done 처리 후 종료
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, user_id, recipient_phone')
    .eq('toss_order_id', orderId)
    .maybeSingle()

  if (existingOrder) {
    await supabaseAdmin
      .from('order_drafts')
      .update({ confirm_status: CONFIRM_STATUS.DONE })
      .eq('id', draftId)
    return { ok: true, order: existingOrder }
  }

  // persisting으로 변경
  await supabaseAdmin
    .from('order_drafts')
    .update({ confirm_status: CONFIRM_STATUS.PERSISTING })
    .eq('id', draftId)

  const pl = draft.payload as {
    orderInput: OrderInput
    itemSnapshots: OrderItemSnapshot[]
    pricing: { finalTotal: number; taxFreeAmount: number; appliedPoints: number; couponDiscount: number }
  }
  const orderInput: OrderInput = pl.orderInput
  const itemSnapshots: OrderItemSnapshot[] = pl.itemSnapshots
  const serverTotalAmount = draft.amount
  const serverTaxFreeAmount = draft.tax_free_amount ?? 0
  const pricing: PricingResult = {
    originalTotal: 0,
    discountedTotal: pl.pricing.finalTotal,
    shipping: 0,
    couponDiscount: pl.pricing.couponDiscount,
    appliedPoints: pl.pricing.appliedPoints,
    finalTotal: pl.pricing.finalTotal,
    taxFreeAmount: pl.pricing.taxFreeAmount,
  }
  const cartUserId = draft.user_id ?? null
  const user = cartUserId ? { id: cartUserId } : null

  try {
    const today = new Date()
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const sanitizedOrderId = String(orderId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const idempotencySuffix = sanitizedOrderId.slice(0, 4)
    let orderNumber = idempotencySuffix ? `${datePrefix}-${idempotencySuffix}` : ''

    if (!orderNumber) {
      for (let i = 0; i < 5; i += 1) {
        const suffix = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
        const candidate = `${datePrefix}-${suffix}`
        const { data: exists } = await supabaseAdmin.from('orders').select('id').eq('order_number', candidate).maybeSingle()
        if (!exists) {
          orderNumber = candidate
          break
        }
      }
    }
    if (!orderNumber) {
      await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
      return { ok: false, error: 'order_number_generation_failed' }
    }

    const payload = orderInput
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
      toss_order_id: orderId,
      toss_payment_key: paymentKey ?? undefined,
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
      console.error('[toss-persist] 주문 생성 실패:', orderError)
      return { ok: false, error: 'order_insert_failed' }
    }

    const orderItems = itemSnapshots.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.final_unit_price ?? item.price,
    }))
    if (orderItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems)
      if (itemsError) {
        await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
        return { ok: false, error: 'order_items_insert_failed' }
      }
    }

    if (user && pricing.appliedPoints > 0) {
      const pointsOk = await usePoints(
        user.id,
        pricing.appliedPoints,
        order.id,
        `주문 #${orderNumber} 포인트 사용`,
        supabaseAdmin
      )
      if (!pointsOk) {
        await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
        return { ok: false, error: 'points_failed' }
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
        await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
        return { ok: false, error: 'coupon_failed' }
      }
    }

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
      for (const p of Array.from(seen.values())) {
        let query = supabaseAdmin.from('carts').delete().eq('user_id', uid).eq('product_id', p.productId)
        if (p.promotionGroupId != null && p.promotionGroupId !== '') {
          query = query.eq('promotion_group_id', p.promotionGroupId)
        } else {
          query = query.is('promotion_group_id', null)
        }
        await query
      }
    }

    if (user?.id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: user.id,
          title: '주문이 완료되었습니다.',
          content: `주문번호 ${orderNumber}의 결제가 완료되었습니다.`,
          type: 'general',
          is_read: false,
          order_id: order.id,
        })
      } catch {
        // non-fatal
      }
    }

    const orderCompletePhone = sanitizePhoneDigits(String(order?.orderer_phone ?? payload.orderer_phone ?? ''))
    const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
    const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
    const topProductName = sortedByPrice[0]?.product_name || '상품'
    const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`

    if (orderCompletePhone.length >= 10) {
      try {
        const result = await sendOrderCompleteSms({ phone: orderCompletePhone, orderNumber })
        if (!result.success) {
          console.error('[toss-persist] 주문 완료 SMS 실패:', result.detail)
        }
      } catch (e) {
        console.error('[toss-persist] 주문 완료 SMS 실패:', e)
      }
    }
    // gift notification flow removed

    await supabaseAdmin
      .from('order_drafts')
      .update({ confirm_status: CONFIRM_STATUS.DONE })
      .eq('id', draftId)

    return {
      ok: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        recipient_phone: order.recipient_phone ?? null,
      },
    }
  } catch (err) {
    console.error('[toss-persist] 예외:', err)
    await supabaseAdmin.from('order_drafts').update({ confirm_status: CONFIRM_STATUS.FAILED }).eq('id', draftId)
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' }
  }
}
