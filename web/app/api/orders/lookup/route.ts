import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizePhoneForOrderMatch } from '@/lib/phone/kr'
import { orderLookupGetQuerySchema } from '@/lib/validation/schemas/phone-kr'

export const dynamic = 'force-dynamic'

/**
 * GET: 주문조회 (비회원 포함)
 * - 쿼리: order_number, phone (수령인 전화번호)
 * - 서비스 롤 사용으로 RLS 없이 조회 (비회원 주문 user_id null도 조회 가능)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qParsed = orderLookupGetQuerySchema.safeParse({
      order_number: searchParams.get('order_number') ?? '',
      phone: searchParams.get('phone') ?? '',
    })
    if (!qParsed.success) {
      const msg =
        qParsed.error.issues[0]?.message ?? '주문번호와 수령인 연락처를 입력해주세요.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const orderNumber = qParsed.data.order_number
    const normalizedPhone = qParsed.data.phone

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
        tracking_company,
        refund_completed_at,
        created_at,
        updated_at
      `)
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 수령인 연락처를 확인해주세요.' },
        { status: 404 }
      )
    }

    const orderPhoneNorm = normalizePhoneForOrderMatch(order.recipient_phone || '')
    if (orderPhoneNorm !== normalizedPhone) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 수령인 연락처를 확인해주세요.' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { error: '주문 정보를 불러오지 못했습니다.' },
        { status: 500 }
      )
    }

    const productIds = Array.from(new Set((orderItems || []).map((i) => i.product_id)))
    let productImages: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, priority')
        .in('product_id', productIds)
        .order('priority', { ascending: true })
      if (imagesData && imagesData.length > 0) {
        const byProduct = new Map<string, string>()
        for (const img of imagesData) {
          if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, img.image_url)
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

    return NextResponse.json({
      order: { ...order, order_items },
    })
  } catch (error: unknown) {
    console.error('주문 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
