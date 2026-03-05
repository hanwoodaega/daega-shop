import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { sendOrderCompleteSms } from '@/lib/sms/send'
import { getServerBaseUrl } from '@/lib/utils/server-url'
import crypto from 'crypto'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'

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

    const { orderId, amount, orderInput } = await request.json()
    if (!orderId || !orderInput) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
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
    const giftExpiresAt = payload.is_gift ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() : null

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
      gift_card_design: payload.gift_card_design,
      payment_method: payload.payment_method || 'toss_card',
    }
    orderInsertData.toss_order_id = orderId
    orderInsertData.toss_payment_key = `MOCK_${orderId}`

    if (payload.is_gift) {
      orderInsertData.gift_token = giftToken
      orderInsertData.gift_status = 'pending'
      orderInsertData.gift_expires_at = giftExpiresAt
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      const message = orderError?.message || '주문 생성 실패'
      console.error('[mock-confirm] 주문 insert 실패:', orderError)
      return NextResponse.json(
        { error: '주문 생성 실패', details: orderError, message },
        { status: 500 }
      )
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
        return NextResponse.json(
          { error: '주문 상품 저장 실패', details: itemsError },
          { status: 500 }
        )
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

    // 주문 완료 안내 문자 (수령인 연락처 있으면 발송)
    if (!payload.is_gift && normalizedPhone.length >= 10) {
      try {
        const baseUrl = (await getServerBaseUrl()) || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
        const orderLookupUrl = `${baseUrl.replace(/\/$/, '')}/order-lookup`
        await sendOrderCompleteSms(normalizedPhone, orderNumber, orderLookupUrl)
      } catch (e) {
        console.error('주문 완료 문자 발송 실패:', e)
      }
    }

    return NextResponse.json({ success: true, order, gift_token: giftToken })
  } catch (error: any) {
    console.error('모의 결제 승인 처리 오류:', error)
    const status = error?.message ? 400 : 500
    return NextResponse.json(
      {
        error: error?.message || '서버 오류',
        details: error?.details || error,
      },
      { status }
    )
  }
}
