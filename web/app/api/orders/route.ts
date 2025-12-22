import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'

export const dynamic = 'force-dynamic'

// GET: 사용자 주문 목록 조회 (구매확정 여부 포함)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 주문 목록 조회
    // 1. 먼저 주문 목록만 조회 (조인 없이)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        order_number,
        total_amount,
        status,
        delivery_type,
        delivery_time,
        shipping_address,
        shipping_name,
        shipping_phone,
        delivery_note,
        tracking_number,
        is_gift,
        gift_token,
        gift_message,
        gift_card_design,
        gift_status,
        gift_expires_at,
        refund_status,
        refund_amount,
        refund_requested_at,
        refund_completed_at,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('주문 목록 조회 실패:', ordersError)
      return NextResponse.json({ 
        error: '주문 목록 조회 실패', 
        details: ordersError.message 
      }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // 2. 주문 상품 및 상품 정보 조회
    const orderIds = orders.map(o => o.id)
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        price,
        products (
          id,
          name
        )
      `)
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('주문 상품 조회 실패:', itemsError)
      // 상품 조회 실패해도 주문 목록은 반환 (빈 상품 목록)
    }

    // 3. 상품 이미지 조회
    const productIds = Array.from(new Set(orderItems?.map(item => item.product_id) || []))
    let productImages: Record<string, string> = {}
    
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)
      
      if (imagesData) {
        productImages = imagesData.reduce((acc: any, img: any) => {
          acc[img.product_id] = img.image_url
          return acc
        }, {})
      }
    }

    // 4. 구매확정 여부 확인
    let confirmedOrderIds = new Set<string>()
    
    if (orderIds.length > 0) {
      const { data: pointHistories, error: pointError } = await supabase
        .from('point_history')
        .select('order_id')
        .eq('user_id', user.id)
        .in('order_id', orderIds)
        .eq('type', 'purchase')
        .not('order_id', 'is', null) // order_id가 null이 아닌 것만

      if (pointError) {
        console.error('구매확정 여부 조회 실패:', {
          error: pointError,
          orderIds: orderIds.length,
          userId: user.id,
        })
      } else if (pointHistories) {
        confirmedOrderIds = new Set(
          pointHistories
            .map((ph: any) => ph.order_id)
            .filter((id: string | null) => id !== null) // null 제거
        )
      }
    }

    // 5. 데이터 조립
    const itemsMap = (orderItems || []).reduce((acc: any, item: any) => {
      if (!acc[item.order_id]) acc[item.order_id] = []
      
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      
      acc[item.order_id].push({
        ...item,
        product: {
          name: product?.name || '상품',
          image_url: productImages[item.product_id] || null
        }
      })
      return acc
    }, {})

    const ordersWithDetails = orders.map(order => ({
      ...order,
      order_items: itemsMap[order.id] || [],
      is_confirmed: confirmedOrderIds.has(order.id)
    }))

    return NextResponse.json({ orders: ordersWithDetails })
  } catch (error: any) {
    console.error('주문 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}

// POST: 주문 생성
export async function POST(request: NextRequest) {
  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/supabase-server')
    const supabaseAdmin = createSupabaseAdminClient()
    
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      total_amount,
      delivery_type,
      delivery_time,
      shipping_address,
      shipping_name,
      shipping_phone,
      delivery_note,
      used_coupon_id,
      used_points,
      is_gift,
      gift_message,
      gift_card_design,
      items: rawItems
    } = body

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json({ error: '주문 상품이 없습니다.' }, { status: 400 })
    }

    // 주문 번호 생성
    const today = new Date()
    const orderNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 주문 데이터 준비
    const orderInsertData: any = {
      user_id: user.id,
      order_number: orderNumber,
      total_amount: total_amount,
      status: 'ORDER_RECEIVED',
      delivery_type,
      delivery_time,
      shipping_address,
      shipping_name,
      shipping_phone,
      delivery_note,
      is_gift: is_gift || false,
      gift_message,
      gift_card_design,
    }

    if (is_gift) {
      orderInsertData.gift_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      orderInsertData.gift_status = 'pending'
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 5)
      orderInsertData.gift_expires_at = expiresAt.toISOString()
    }

    // 1. 주문 생성
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      console.error('주문 생성 실패:', orderError)
      return NextResponse.json({ error: '주문 생성 실패', details: orderError?.message || '알 수 없는 오류' }, { status: 500 })
    }

    // 2. 주문 상품 생성
    const orderItems = rawItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('주문 상품 저장 실패:', itemsError)
      return NextResponse.json({ error: '주문 상품 저장 실패' }, { status: 500 })
    }

    // 3. 포인트 사용 처리
    if (used_points && used_points > 0) {
      await usePoints(user.id, used_points, order.id, `주문 #${orderNumber} 포인트 사용`, supabaseAdmin)
    }

    // 4. 쿠폰 사용 처리
    if (used_coupon_id) {
      await supabaseAdmin
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          order_id: order.id,
        })
        .eq('id', used_coupon_id)
        .eq('user_id', user.id)
    }

    // 5. 알림 생성
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: '주문이 완료되었습니다.',
        content: `주문번호 ${orderNumber}의 결제가 완료되었습니다.`,
        type: 'general',
        is_read: false,
        order_id: order.id
      })
    } catch (e) {
      console.error('알림 생성 실패:', e)
    }

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('주문 처리 예외:', error)
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error?.message || '알 수 없는 오류'
    }, { status: 500 })
  }
}
