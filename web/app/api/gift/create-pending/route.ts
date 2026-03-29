import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import crypto from 'crypto'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'
import { calculateOrderPricing, OrderInput } from '@/lib/order/order-pricing.server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { sanitizePhoneDigits } from '@/lib/phone/kr'

/**
 * 선물 주문 미리 생성 (결제 전 상태)
 * 카카오톡 공유를 위해 결제 전에 주문을 생성하고 선물 링크를 반환합니다.
 * 금액·할인·프로모션은 서버 calculateOrderPricing으로 계산합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()

    const {
      items = [],
      gift_message = null,
      gift_recipient_phone = null,
      used_coupon_id = null,
      used_points = 0,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '상품이 없습니다.' }, { status: 400 })
    }

    const orderInput: OrderInput = {
      items: items.map((item: { productId: string; quantity: number; promotion_group_id?: string | null }) => ({
        productId: item.productId,
        quantity: item.quantity,
        promotion_group_id: item.promotion_group_id ?? null,
      })),
      delivery_type: 'regular',
      delivery_time: null,
      shipping_address: '선물 수령 대기',
      shipping_name: '선물 수령 대기',
      shipping_phone: '',
      delivery_note: null,
      used_coupon_id: used_coupon_id ?? null,
      used_points: Number(used_points) || 0,
      is_gift: true,
      gift_message: gift_message ?? null,
    }

    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin: supabase,
      userId: user.id,
      input: orderInput,
    })

    const giftToken = crypto.randomBytes(32).toString('hex')
    const expiresAtISO = getGiftExpiresAtEndOfDayKST()

    const orderData: {
      user_id: string
      total_amount: number
      status: string
      delivery_type: string
      shipping_address: string
      shipping_name: string
      shipping_phone: string
      is_gift: boolean
      gift_token: string
      gift_message: string | null
      gift_recipient_phone?: string | null
      gift_expires_at: string
    } = {
      user_id: user.id,
      total_amount: pricing.finalTotal,
      status: 'pending',
      delivery_type: 'regular',
      shipping_address: '선물 수령 대기',
      shipping_name: '선물 수령 대기',
      shipping_phone: '',
      is_gift: true,
      gift_token: giftToken,
      gift_message: gift_message,
      gift_recipient_phone: gift_recipient_phone ? sanitizePhoneDigits(String(gift_recipient_phone)) : null,
      gift_expires_at: expiresAtISO,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      throw new Error(orderError.message)
    }

    if (order && itemSnapshots.length > 0) {
      const orderItems = itemSnapshots.map((snapshot) => ({
        order_id: order.id,
        product_id: snapshot.product_id,
        quantity: snapshot.quantity,
        price: snapshot.final_unit_price ?? snapshot.price,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('[gift/create-pending] 주문 상품 저장 실패:', itemsError)
      }
    }

    return NextResponse.json({
      order,
      gift_token: giftToken,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('gift/create-pending', error)
  }
}

