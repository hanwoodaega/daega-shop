import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import crypto from 'crypto'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'

/**
 * 선물 주문 미리 생성 (결제 전 상태)
 * 카카오톡 공유를 위해 결제 전에 주문을 생성하고 선물 링크를 반환합니다.
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
      items,
      gift_message = null,
      gift_recipient_phone = null,
      used_coupon_id = null,
      used_points = 0,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '상품이 없습니다.' }, { status: 400 })
    }

    // 총 금액 계산
    const totalAmount = items.reduce((sum: number, item: { price: number; quantity: number }) => 
      sum + (item.price * item.quantity), 0)
    const finalAmount = totalAmount - used_points

    // 선물 토큰 생성
    const giftToken = crypto.randomBytes(32).toString('hex')
    
    // 만료일 설정 (7일째 되는 날 23:59:59 KST까지)
    const expiresAtISO = getGiftExpiresAtEndOfDayKST()

    // 선물 주문 (결제 전 상태)
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
      total_amount: finalAmount,
      status: 'pending',
      delivery_type: 'regular',
      shipping_address: '선물 수령 대기',
      shipping_name: '선물 수령 대기',
      shipping_phone: '',
      is_gift: true,
      gift_token: giftToken,
      gift_message: gift_message,
      gift_recipient_phone: gift_recipient_phone ? String(gift_recipient_phone).replace(/\D/g, '').slice(0, 13) : null,
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

    // 주문 아이템 저장
    if (order && items && items.length > 0) {
      const orderItems = items.map((item: { productId: string; quantity: number; price: number }) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        // 주문 아이템 저장 실패 (부분 실패)
      }
    }

    return NextResponse.json({ 
      order, 
      gift_token: giftToken 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

