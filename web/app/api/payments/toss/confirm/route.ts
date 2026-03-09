import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteAlimtalk, sendGiftNotification } from '@/lib/sms/send'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'
import crypto from 'crypto'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()

    const { paymentKey, orderId, amount, orderInput, mock } = await request.json()
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

    if (amount && Number(amount) !== pricing.finalTotal) {
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    if (!isMock) {
      const auth = Buffer.from(`${secretKey}:`).toString('base64')
      const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount: pricing.finalTotal }),
      })

      if (!confirmRes.ok) {
        const errorData = await confirmRes.json().catch(() => ({}))
        return NextResponse.json(
          { error: '결제 승인에 실패했습니다.', details: errorData },
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
        console.error('알림 생성 실패:', e)
      }
    }

    // 주문 완료 알림톡 (비회원일 때만, 수령인 연락처 있으면 발송, 실패 시 SMS는 알리고에서 자동 발송)
    if (!user && !payload.is_gift && normalizedPhone.length >= 10) {
      try {
        const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
        const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
        const topProductName = sortedByPrice[0]?.product_name || '상품'
        const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`
        const result = await sendOrderCompleteAlimtalk({
          to: normalizedPhone,
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

    // 선물 알림톡 (받는 분 휴대폰으로 발송, 실패해도 주문은 유지)
    if (payload.is_gift && giftToken && payload.gift_recipient_phone && giftExpiresAt) {
      try {
        const baseUrl = (await getServerBaseUrl()) || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
        const receiveUrl = `${baseUrl.replace(/\/$/, '')}/gift/receive/${giftToken}`
        const senderName = (payload.gift_sender_name || payload.shipping_name || '보내는 분').trim() || '보내는 분'
        const totalQty = itemSnapshots.reduce((sum, s) => sum + s.quantity, 0)
        const sortedByPrice = [...itemSnapshots].sort((a, b) => (b.final_unit_price ?? 0) - (a.final_unit_price ?? 0))
        const topProductName = sortedByPrice[0]?.product_name || '상품'
        const productName = totalQty <= 1 ? topProductName : `${topProductName} 외 ${totalQty - 1}개`
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
