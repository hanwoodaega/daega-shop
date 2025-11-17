import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * 선물 주문 미리 생성 (결제 전 상태)
 * 카카오톡 공유를 위해 결제 전에 주문을 생성하고 선물 링크를 반환합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    
    const {
      items,
      gift_message = null,
      gift_card_design = null,
      gift_wrapping_ribbon = false,
      gift_wrapping_premium_box = false,
      gift_wrapping_handwritten_card = false,
      gift_wrapping_fee = 0,
      used_coupon_id = null,
      used_points = 0,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '상품이 없습니다.' }, { status: 400 })
    }

    // 총 금액 계산
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const finalAmount = totalAmount + gift_wrapping_fee - used_points

    // 선물 토큰 생성
    const giftToken = crypto.randomBytes(32).toString('hex')

    // 주문 생성 (결제 전 상태)
    const orderData: any = {
      user_id: user.id,
      total_amount: finalAmount,
      status: 'pending', // 결제 대기 상태
      delivery_type: 'regular',
      shipping_address: '선물 수령 대기',
      shipping_name: '선물 수령 대기',
      shipping_phone: '',
      is_gift: true,
      gift_token: giftToken,
      gift_message: gift_message,
      gift_card_design: gift_card_design,
      gift_wrapping_ribbon: gift_wrapping_ribbon,
      gift_wrapping_premium_box: gift_wrapping_premium_box,
      gift_wrapping_handwritten_card: gift_wrapping_handwritten_card,
      gift_wrapping_fee: gift_wrapping_fee,
    }

    // gift_token 컬럼이 없으면 gift_info JSON에 저장
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      // 컬럼이 없으면 JSON 필드로 재시도
      if (orderError.code === '42703' || orderError.message?.includes('column')) {
        const orderDataWithoutGiftColumns = {
          user_id: user.id,
          total_amount: finalAmount,
          status: 'pending',
          delivery_type: 'regular',
          shipping_address: '선물 수령 대기',
          shipping_name: '선물 수령 대기',
          shipping_phone: '',
          gift_info: JSON.stringify({
            token: giftToken,
            message: gift_message,
            card_design: gift_card_design,
            wrapping: {
              ribbon: gift_wrapping_ribbon,
              premium_box: gift_wrapping_premium_box,
              handwritten_card: gift_wrapping_handwritten_card,
            },
            wrapping_fee: gift_wrapping_fee
          })
        }

        const { data: retryOrder, error: retryError } = await supabase
          .from('orders')
          .insert(orderDataWithoutGiftColumns)
          .select()
          .single()

        if (retryError) {
          throw new Error(retryError.message)
        }

        // 주문 아이템 저장
        if (retryOrder && items && items.length > 0) {
          const orderItems = items.map((item: any) => ({
            order_id: retryOrder.id,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
          }))

          await supabase.from('order_items').insert(orderItems)
        }

        return NextResponse.json({ 
          order: retryOrder, 
          gift_token: giftToken 
        })
      }
      
      throw new Error(orderError.message)
    }

    // 주문 아이템 저장
    if (order && items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('주문 아이템 저장 실패:', itemsError)
      }
    }

    return NextResponse.json({ 
      order, 
      gift_token: giftToken 
    })
  } catch (error: any) {
    console.error('선물 주문 생성 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

