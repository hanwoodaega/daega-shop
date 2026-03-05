import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { generateOtpCode, hashOtp, normalizePhone } from '@/lib/auth/otp-utils'

export const dynamic = 'force-dynamic'

const OTP_EXPIRES_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_DAILY_SENDS = 20

function normalizePhoneLookup(value: string): string {
  return value.replace(/\D/g, '').slice(-11).padStart(10, '0').slice(0, 11)
}

async function sendOtpSms(phone: string, code: string): Promise<{ success: boolean; detail?: string }> {
  const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL
  const SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN
  if (!SMS_SERVICE_URL || !SMS_SERVICE_TOKEN) {
    return { success: false, detail: 'sms_config_missing' }
  }
  try {
    const url = `${SMS_SERVICE_URL.replace(/\/$/, '')}/sms/send-otp`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        text: `[대가정육마트] 주문조회 인증번호는 ${code}입니다.\n(타인에게 공유하지 마세요)`,
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, detail: err?.error || err?.message || `http_${response.status}` }
    }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[order-lookup send-otp] SMS 발송 예외:', msg)
    return { success: false, detail: msg || 'fetch_error' }
  }
}

/**
 * POST: 주문조회용 인증번호 발송
 * - body: { order_number, phone }
 * - 해당 주문의 수령인 연락처와 일치할 때만 발송
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_number: orderNumber, phone } = body

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { error: '주문번호와 휴대폰 번호를 입력해주세요.' },
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, shipping_phone')
      .eq('order_number', String(orderNumber).trim())
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 휴대폰 번호를 확인해주세요.' },
        { status: 404 }
      )
    }

    const orderPhoneNorm = normalizePhoneLookup(order.shipping_phone || '')
    if (orderPhoneNorm !== normalizedLookup) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다. 주문번호와 휴대폰 번호를 확인해주세요.' },
        { status: 404 }
      )
    }

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

    if (latestOtp?.locked_until && new Date(latestOtp.locked_until) > now) {
      const remaining = Math.ceil((new Date(latestOtp.locked_until).getTime() - now.getTime()) / 1000)
      return NextResponse.json(
        { error: '잠시 후 다시 시도해주세요.', retryAfter: remaining },
        { status: 429 }
      )
    }

    if (latestOtp?.resend_available_at && new Date(latestOtp.resend_available_at) > now) {
      const remaining = Math.ceil((new Date(latestOtp.resend_available_at).getTime() - now.getTime()) / 1000)
      return NextResponse.json(
        { error: '인증 요청 후 재요청까지 1분 소요됩니다.', retryAfter: remaining },
        { status: 429 }
      )
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dailyCount } = await supabase
      .from('auth_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .eq('purpose', purpose)
      .gte('created_at', since)

    if ((dailyCount || 0) >= MAX_DAILY_SENDS) {
      return NextResponse.json(
        { error: '최근 24시간 내 인증 시도 횟수를 초과했습니다.' },
        { status: 429 }
      )
    }

    const verificationCode = generateOtpCode()
    const sendResult = await sendOtpSms(normalizedPhone, verificationCode)

    if (!sendResult.success) {
      return NextResponse.json(
        { error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000).toISOString()
    const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000).toISOString()

    const { error: insertError } = await supabase.from('auth_otps').insert({
      phone: normalizedPhone,
      purpose,
      code_hash: hashOtp(normalizedPhone, verificationCode),
      expires_at: expiresAt,
      attempts: 0,
      resend_available_at: resendAvailableAt,
      locked_until: null,
    })

    if (insertError) {
      return NextResponse.json(
        { error: '인증번호 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
    })
  } catch (err: unknown) {
    console.error('주문조회 인증번호 발송 오류:', err)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
