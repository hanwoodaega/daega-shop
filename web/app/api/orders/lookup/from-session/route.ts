import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone } from '@/lib/auth/otp-utils'

export const dynamic = 'force-dynamic'

/**
 * GET: 세션(쿠키)에 저장된 비회원 최근 주문을 조회
 * - 쿠키: guest_order_lookup = JSON.stringify({ orderId, createdAt })
 * - 주문 생성 직후 한 번만 사용하도록, 응답 시 쿠키를 즉시 삭제
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get('guest_order_lookup')
    if (!cookie?.value) {
      return NextResponse.json({ error: '조회 가능한 주문이 없습니다.' }, { status: 404 })
    }

    let parsed: { orderId?: string; createdAt?: string }
    try {
      parsed = JSON.parse(cookie.value)
    } catch {
      const res = NextResponse.json({ error: '조회 가능한 주문이 없습니다.' }, { status: 404 })
      res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
      return res
    }

    const { orderId } = parsed || {}
    if (!orderId) {
      const res = NextResponse.json({ error: '조회 가능한 주문이 없습니다.' }, { status: 404 })
      res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
      return res
    }

    const supabase = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        delivery_type,
        delivery_time,
        shipping_address,
        recipient_name,
        recipient_phone,
        delivery_note,
        tracking_number,
        refund_completed_at,
        created_at,
        updated_at
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      const res = NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
      res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
      return res
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        price,
        products ( id, name )
      `)
      .eq('order_id', order.id)

    if (itemsError) {
      const res = NextResponse.json({ error: '주문 정보를 불러오지 못했습니다.' }, { status: 500 })
      res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
      return res
    }

    const productIds = Array.from(new Set((orderItems || []).map((i: { product_id: string }) => i.product_id)))
    let productImages: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, priority')
        .in('product_id', productIds)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
      if (imagesData && imagesData.length > 0) {
        const byProduct = new Map<string, string>()
        for (const img of imagesData) {
          if (!byProduct.has(img.product_id)) {
            byProduct.set(img.product_id, img.image_url)
          }
        }
        productImages = Object.fromEntries(byProduct)
      }
    }

    const order_items = (orderItems || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      return {
        ...item,
        product: {
          name: product?.name || '상품',
          image_url: productImages[item.product_id] || null,
        },
      }
    })

    // 게스트 주문취소용 토큰 (기존 verify 로직과 동일)
    const normalizedPhone = normalizePhone(order.recipient_phone || '')
    const cancelExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const payload = {
      orderId: order.id,
      phone: normalizedPhone,
      exp: cancelExpiresAt,
    }
    const raw = JSON.stringify(payload)
    const sig = hashToken(raw)
    const guestCancelToken = Buffer.from(`${raw}.${sig}`).toString('base64url')

    const res = NextResponse.json({
      success: true,
      order: { ...order, order_items },
      guestCancelToken,
    })

    // 한 번 사용 후 쿠키 제거
    res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
    return res
  } catch (err: unknown) {
    console.error('세션 기반 주문조회 오류:', err)
    const res = NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
    res.cookies.set('guest_order_lookup', '', { path: '/api/orders/lookup', maxAge: 0 })
    return res
  }
}

