import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'
import { usePoints } from '@/lib/point/points'
import { getGiftExpiresAtEndOfDayKST } from '@/lib/gift/expires'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { orderCreateBodySchema } from '@/lib/validation/schemas/order-payment'

export const dynamic = 'force-dynamic'

// GET: 사용자 주문 목록 조회 (구매확정 여부 포함)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const monthsParam = searchParams.get('months')
    const months = monthsParam ? Math.min(36, Math.max(1, parseInt(monthsParam, 10) || 1)) : 1

    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const since = new Date()
    since.setMonth(since.getMonth() - months)
    const sinceIso = since.toISOString()

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
        gift_expires_at,
        refund_completed_at,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })

    if (ordersError) {
      return dbErrorResponse('orders GET list', ordersError)
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

    // 3. 상품 이미지 조회 (priority 오름차순, 0이 우선 → 상품당 1장)
    const productIds = Array.from(new Set(orderItems?.map(item => item.product_id) || []))
    let productImages: Record<string, string> = {}

    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, priority')
        .in('product_id', productIds)
        .order('priority', { ascending: true })

      const byProduct = new Map<string, string>()
      imagesData?.forEach((img: any) => {
        if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, img.image_url)
      })
      productImages = Object.fromEntries(byProduct)
    }

    // 4. 데이터 조립
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
      // 구매확정 여부는 status로 판별 (서버 기준)
      is_confirmed: order.status === 'CONFIRMED'
    }))

    return NextResponse.json({ orders: ordersWithDetails })
  } catch (error: unknown) {
    return unknownErrorResponse('orders GET', error)
  }
}

// POST: 주문 생성 (금액은 서버에서 상품/수량/옵션 기준으로만 계산)
export async function POST(request: NextRequest) {
  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/supabase-server')
    const supabaseAdmin = createSupabaseAdminClient()
    
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const parsed = await parseJsonBody(request, orderCreateBodySchema)
    if (!parsed.ok) return parsed.response

    const {
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
      items: rawItems,
    } = parsed.data

    const orderInput = {
      items: rawItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        promotion_group_id: item.promotion_group_id ?? null,
      })),
      delivery_type: delivery_type || 'regular',
      delivery_time: delivery_time ?? null,
      shipping_address: shipping_address || '',
      shipping_name: shipping_name || '',
      shipping_phone: shipping_phone || '',
      delivery_note: delivery_note ?? null,
      used_coupon_id: used_coupon_id ?? null,
      used_points: Number(used_points) || 0,
      is_gift: !!is_gift,
      gift_message: gift_message ?? null,
    } as import('@/lib/order/order-pricing.server').OrderInput

    const { calculateOrderPricing } = await import('@/lib/order/order-pricing.server')
    const { pricing, itemSnapshots } = await calculateOrderPricing({
      supabaseAdmin,
      userId: user.id,
      input: orderInput,
    })

    const orderNumber = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const orderInsertData: any = {
      user_id: user.id,
      order_number: orderNumber,
      total_amount: pricing.finalTotal,
      tax_free_amount: pricing.taxFreeAmount ?? 0,
      points_used: pricing.appliedPoints ?? 0,
      coupon_discount_amount: pricing.couponDiscount ?? 0,
      status: 'ORDER_RECEIVED',
      delivery_type: orderInput.delivery_type,
      delivery_time: orderInput.delivery_time,
      shipping_address: orderInput.shipping_address,
      shipping_name: orderInput.shipping_name,
      shipping_phone: orderInput.shipping_phone,
      delivery_note: orderInput.delivery_note,
      is_gift: orderInput.is_gift,
      gift_message: orderInput.gift_message,
    }

    if (orderInput.is_gift) {
      orderInsertData.gift_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      orderInsertData.gift_expires_at = getGiftExpiresAtEndOfDayKST()
    }

    // 1. 주문 생성
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError || !order) {
      return dbErrorResponse('orders POST insert', orderError ?? new Error('no order'))
    }

    // 2. 주문 상품 생성 (서버 계산된 단가 사용)
    const orderItems = itemSnapshots.map((snapshot) => ({
      order_id: order.id,
      product_id: snapshot.product_id,
      quantity: snapshot.quantity,
      price: snapshot.final_unit_price ?? snapshot.price,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('주문 상품 저장 실패:', itemsError)
      return NextResponse.json({ error: '주문 상품 저장 실패' }, { status: 500 })
    }

    // 3. 포인트 사용 처리
    if (pricing.appliedPoints > 0) {
      await usePoints(user.id, pricing.appliedPoints, order.id, `주문 #${orderNumber} 포인트 사용`, supabaseAdmin)
    }

    // 4. 쿠폰 사용 처리
    if (used_coupon_id && pricing.couponDiscount > 0) {
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
  } catch (error: unknown) {
    return unknownErrorResponse('orders POST', error)
  }
}
