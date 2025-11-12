import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

// POST: 주문 생성
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
      total_amount, 
      delivery_type, 
      delivery_time,
      shipping_address, 
      shipping_name, 
      shipping_phone,
      delivery_note,
      items 
    } = body

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount,
        status: process.env.NODE_ENV === 'development' ? 'delivered' : 'paid',
        delivery_type,
        delivery_time,
        shipping_address,
        shipping_name,
        shipping_phone,
        delivery_note,
      })
      .select()
      .single()

    if (orderError) {
      console.error('주문 생성 실패:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
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

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('주문 생성 에러:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

