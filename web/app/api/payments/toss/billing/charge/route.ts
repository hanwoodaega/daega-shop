import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import crypto from 'crypto'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { cardId, orderInput, orderName } = await request.json()
    if (!cardId || !orderInput) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: '결제 설정이 없습니다.' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: card, error: cardError } = await supabaseAdmin
      .from('payment_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: '등록된 카드 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const billingKey = card.billing_key
    const customerKey = card.customer_key
    if (!billingKey || !customerKey) {
      return NextResponse.json({ error: '카드 결제 정보가 유효하지 않습니다.' }, { status: 400 })
    }

    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user.id,
      input: orderInput as OrderInput,
    })

    const payload: OrderInput = orderInput
    const paymentAmount = pricing.finalTotal

    const tossOrderId = (typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `bill-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`

    const auth = Buffer.from(`${secretKey}:`).toString('base64')
    const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount: paymentAmount,
        orderId: tossOrderId,
        orderName: orderName || '상품 결제',
        customerEmail: user.email || undefined,
        customerName: payload.shipping_name || undefined,
      }),
    })

    if (!chargeRes.ok) {
      const errorData = await chargeRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: '결제 승인에 실패했습니다.', details: errorData },
        { status: 400 }
      )
    }

    const sanitizedOrderId = String(tossOrderId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const orderSuffix = sanitizedOrderId.slice(0, 6) || crypto.randomBytes(3).toString('hex').toUpperCase()
    const today = new Date()
    const orderNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${orderSuffix}`

    const giftToken = payload.is_gift ? crypto.randomBytes(32).toString('hex') : null
    const giftExpiresAt = payload.is_gift ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() : null

    const orderInsertData: any = {
      user_id: user.id,
      order_number: orderNumber,
      total_amount: pricing.finalTotal,
      status: 'ORDER_RECEIVED',
      delivery_type: payload.delivery_type,
      delivery_time: payload.delivery_time,
      shipping_address: payload.shipping_address,
      shipping_name: payload.shipping_name,
      shipping_phone: payload.shipping_phone,
      delivery_note: payload.delivery_note,
      is_gift: payload.is_gift,
      gift_message: payload.gift_message,
      gift_card_design: payload.gift_card_design,
      payment_method: 'toss_billing',
    }

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
      return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 })
    }

    const orderItems = itemSnapshots.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }))

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        return NextResponse.json({ error: '주문 상품 저장 실패' }, { status: 500 })
      }
    }

    if (pricing.appliedPoints > 0) {
      await usePoints(
        user.id,
        pricing.appliedPoints,
        order.id,
        `주문 #${orderNumber} 포인트 사용`,
        supabaseAdmin
      )
    }

    if (payload.used_coupon_id && pricing.couponDiscount > 0) {
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

    return NextResponse.json({ success: true, order, gift_token: giftToken })
  } catch (error: any) {
    console.error('빌링 결제 처리 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
