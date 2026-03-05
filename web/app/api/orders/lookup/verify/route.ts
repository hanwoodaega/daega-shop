import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashOtp, normalizePhone } from '@/lib/auth/otp-utils'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10

function normalizePhoneLookup(value: string): string {
  return value.replace(/\D/g, '').slice(-11).padStart(10, '0').slice(0, 11)
}

/**
 * POST: 주문조회 OTP 검증 후 주문 내역 반환
 * - body: { order_number, phone, code }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_number: orderNumber, phone, code } = body

    if (!orderNumber || !phone || !code) {
      return NextResponse.json(
        { error: '주문번호, 휴대폰 번호, 인증번호를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    const normalizedLookup = normalizePhoneLookup(phone)
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      )
    }

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
        gift_status,
        gift_expires_at,
        refund_status,
        refund_amount,
        refund_requested_at,
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

    const orderPhoneNorm = normalizePhoneLookup(order.shipping_phone || '')
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
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)
      if (imagesData) {
        productImages = imagesData.reduce((acc: Record<string, string>, img: { product_id: string; image_url: string }) => {
          acc[img.product_id] = img.image_url
          return acc
        }, {})
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
      success: true,
      order: { ...order, order_items },
    })
  } catch (err: unknown) {
    console.error('주문조회 인증 오류:', err)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
