import { NextRequest, NextResponse } from 'next/server'

/**
 * 선물 토큰으로 주문 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }
    
    // gift_token으로 주문 조회 (RLS 우회를 위해 admin client 사용)
    const { supabaseAdmin } = await import('@/lib/supabase/supabase-admin')
    let { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        total_amount,
        status,
        is_gift,
        gift_token,
        gift_message,
        gift_expires_at,
        shipping_address,
        shipping_name,
        shipping_phone,
        created_at,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            name,
            brand,
            weight_gram
          )
        )
      `)
      .eq('gift_token', token)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!orders) {
      return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
    }

    // 보낸 사람이 주문을 취소한 경우: 받는 사람에게 "주문이 취소되었습니다." 만 표시
    if (orders.status === 'cancelled') {
      return NextResponse.json(
        { error: '주문이 취소되었습니다.', cancelled: true },
        { status: 410 }
      )
    }

    // 보낸 사람 정보 조회
    let senderInfo = null
    if (orders.user_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', orders.user_id)
        .maybeSingle()
      
      if (!userError && userData) {
        senderInfo = userData
      }
    }

    // 상품 이미지 조회 (product_images 우선순위 순, 상품당 1장)
    const orderItems = orders.order_items || []
    const productIds = Array.from(new Set(orderItems.map((item: any) => item.products?.id || item.product_id).filter(Boolean)))
    let productImageMap: Record<string, string | null> = {}
    if (productIds.length > 0) {
      const { data: imagesData } = await supabaseAdmin
        .from('product_images')
        .select('product_id, image_url, priority')
        .in('product_id', productIds)
        .order('priority', { ascending: true })

      const byProduct = new Map<string, string | null>()
      imagesData?.forEach((img: any) => {
        if (img?.product_id && !byProduct.has(img.product_id)) {
          byProduct.set(img.product_id, img.image_url || null)
        }
      })
      productImageMap = Object.fromEntries(byProduct)
    }

    const orderWithImages = {
      ...orders,
      users: senderInfo,
      order_items: orderItems.map((item: any) => {
        const product = item.products || {}
        const pid = product.id || item.product_id
        return {
          ...item,
          products: {
            ...product,
            image_url: (pid && productImageMap[pid]) || null,
          },
        }
      }),
    }

    // 이미 수령된 선물인 경우 (status === 'gift_received')
    if (orders.status === 'gift_received') {
      return NextResponse.json({ 
        order: orderWithImages,
        alreadyReceived: true
      })
    }

    // 만료일 체크
    let expiresAt: Date | null = null
    if (orders.gift_expires_at) {
      expiresAt = new Date(orders.gift_expires_at)
    }

    // 만료된 선물인 경우 (만료일 지남)
    if (orders.status !== 'gift_received' && expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ 
        error: '선물 링크가 만료되었습니다. (7일 경과)',
        expired: true,
        expires_at: expiresAt?.toISOString() || orders.gift_expires_at,
        order: orderWithImages
      }, { status: 410 })
    }

    return NextResponse.json({ 
      order: orderWithImages,
      expires_at: expiresAt?.toISOString() || null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

/**
 * 선물 수령 시 주문 정보 업데이트 (이름, 주소 입력)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const { token } = await params
    const body = await request.json()

    const {
      recipient_name,
      recipient_phone,
      zipcode,
      address,
      address_detail,
      delivery_note
    } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    if (!recipient_name || !recipient_phone || !address) {
      return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 })
    }

    // 토큰으로 주문 조회 (RLS 우회를 위해 admin client 사용)
    const { supabaseAdmin } = await import('@/lib/supabase/supabase-admin')
    const { data: order, error: tokenError } = await supabaseAdmin
      .from('orders')
      .select('id, shipping_address, status, gift_token, gift_expires_at, user_id, total_amount, created_at, is_gift')
      .eq('gift_token', token)
      .maybeSingle()

    if (tokenError || !order) {
      return NextResponse.json({ error: '유효하지 않은 선물 링크입니다.' }, { status: 404 })
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: '주문이 취소되었습니다.' }, { status: 410 })
    }

    // 이미 수령된 선물인 경우 (status === 'gift_received')
    if (order.status === 'gift_received') {
      return NextResponse.json({ error: '이미 수령된 선물입니다.' }, { status: 400 })
    }

    // 만료일 체크
    let expiresAt: Date | null = null
    if (order.gift_expires_at) {
      expiresAt = new Date(order.gift_expires_at)
    }

    // 만료된 선물인 경우 (만료일 지남)
    if (order.status !== 'gift_received' && expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ 
        error: '선물 링크가 만료되었습니다. (7일 경과)',
        expired: true,
        expires_at: expiresAt?.toISOString() || order.gift_expires_at
      }, { status: 410 })
    }

    // 주문 정보 업데이트 (RLS 우회를 위해 admin client 사용)
    const shippingAddress = `${address}${address_detail ? ' ' + address_detail : ''}`
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        shipping_name: recipient_name,
        shipping_phone: recipient_phone,
        shipping_address: shippingAddress,
        delivery_note: delivery_note || null,
        status: 'gift_received',
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: '주문 정보 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '선물 수령 정보가 등록되었습니다.',
      order: updatedOrder 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

