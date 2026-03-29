import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashOtp, hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import { parseJsonBody } from '@/lib/api/parse-json'
import { orderLookupVerifyBodySchema } from '@/lib/validation/schemas/order-lookup'
import { normalizePhoneForOrderMatch } from '@/lib/phone/kr'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10

/**
 * POST: 주문조회 OTP 검증 후 주문 내역 반환
 * - body: { order_number, phone, code }
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, orderLookupVerifyBodySchema)
    if (!parsed.ok) return parsed.response

    const { order_number: orderNumber, phone, code } = parsed.data

    const normalizedPhone = normalizePhone(phone)
    const normalizedLookup = normalizePhoneForOrderMatch(phone)

    const supabase = createSupabaseAdminClient()
    const purpose = 'order_lookup'
    const now = new Date()

    const { data: latestOtp } = await supabase
      .from('auth_otps')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestOtp) {
      return NextResponse.json(
        { error: '인증번호가 만료되었습니다. 인증번호를 다시 요청해주세요.' },
        { status: 400 }
      )
    }

    if (latestOtp.locked_until && new Date(latestOtp.locked_until) > now) {
      return NextResponse.json(
        { error: '잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    if (latestOtp.expires_at && new Date(latestOtp.expires_at) < now) {
      return NextResponse.json(
        { error: '인증번호가 만료되었습니다. 인증번호를 다시 요청해주세요.' },
        { status: 400 }
      )
    }

    if ((latestOtp.attempts || 0) >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      await supabase
        .from('auth_otps')
        .update({ locked_until: lockedUntil })
        .eq('id', latestOtp.id)
      return NextResponse.json(
        { error: '인증 시도 횟수를 초과했습니다.' },
        { status: 429 }
      )
    }

    const hashedCode = hashOtp(normalizedPhone, String(code))
    if (latestOtp.code_hash !== hashedCode) {
      const attempts = (latestOtp.attempts || 0) + 1
      const updateData: { attempts: number; locked_until?: string } = { attempts }
      if (attempts >= MAX_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      }
      await supabase.from('auth_otps').update(updateData).eq('id', latestOtp.id)
      return NextResponse.json(
        { error: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    const num = String(orderNumber).trim()
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
        shipping_name,
        shipping_phone,
        delivery_note,
        tracking_number,
        is_gift,
        gift_message,
        gift_expires_at,
        refund_completed_at,
        created_at,
        updated_at
      `)
      .eq('order_number', num)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const orderPhoneNorm = normalizePhoneForOrderMatch(order.shipping_phone || '')
    if (orderPhoneNorm !== normalizedLookup) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
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

    // 게스트 주문취소용 토큰 (주문 ID + 휴대폰 + 만료시각 + 서명)
    const cancelExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const payload = {
      orderId: order.id,
      phone: normalizedPhone,
      exp: cancelExpiresAt,
    }
    const raw = JSON.stringify(payload)
    const sig = hashToken(raw)
    const guestCancelToken = Buffer.from(`${raw}.${sig}`).toString('base64url')

    return NextResponse.json({
      success: true,
      order: { ...order, order_items },
      guestCancelToken,
    })
  } catch (err: unknown) {
    console.error('주문조회 인증 오류:', err)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
