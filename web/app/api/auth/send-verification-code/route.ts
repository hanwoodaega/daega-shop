import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { generateOtpCode, hashOtp, normalizePhone, normalizeUsername } from '@/lib/auth/otp-utils'

const OTP_EXPIRES_MINUTES = 3
const RESEND_COOLDOWN_SECONDS = 60
const MAX_DAILY_SENDS: Record<string, number> = {
  find_id: 10,
  reset_pw: 10,
  signup: 100, //20
  verify_phone: 100, //20
}
const LOCK_MINUTES = 10

const SOCIAL_LOGIN_MESSAGE = '카카오/네이버 계정으로 가입되어 있습니다.\n카카오/네이버 로그인을 이용해 주세요.'

/**
 * 인증번호 발송 API (카카오 알림톡 + SMS fallback)
 * POST /api/auth/send-verification-code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, purpose, username, allowMerge } = body

    if (!phone || !purpose) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (!['signup', 'find_id', 'reset_pw', 'verify_phone'].includes(purpose)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const phoneNumber = normalizePhone(phone)
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    if (purpose === 'signup' || purpose === 'verify_phone') {
      let currentUserId: string | null = null
      if (purpose === 'verify_phone') {
        const user = await getUserFromServer()
        if (!user) {
          return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
        }
        currentUserId = user.id
      }

      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id, username_normalized')
        .eq('phone', phoneNumber)
        .maybeSingle()

      if (existingPhone && existingPhone.id !== currentUserId && !allowMerge) {
        if (!existingPhone.username_normalized) {
          return NextResponse.json(
            { error: SOCIAL_LOGIN_MESSAGE, code: 'PHONE_EXISTS' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          {
            error: SOCIAL_LOGIN_MESSAGE,
            code: 'PHONE_EXISTS',
            actions: ['login', 'find-id', 'reset-password'],
          },
          { status: 409 }
        )
      }

      if (username) {
        const normalizedUsername = normalizeUsername(String(username))
        if (normalizedUsername.length < 6) {
          return NextResponse.json({ error: '아이디는 최소 6자 이상이어야 합니다.' }, { status: 400 })
        }
        const { data: existingUsername } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username_normalized', normalizedUsername)
          .maybeSingle()

        if (existingUsername) {
          return NextResponse.json(
            { error: '이미 사용 중인 아이디입니다.', code: 'USERNAME_EXISTS' },
            { status: 409 }
          )
        }
      }
    }

    if (purpose === 'find_id') {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, username_normalized')
        .eq('phone', phoneNumber)
        .maybeSingle()

      if (!existingUser) {
        return NextResponse.json({ error: '가입된 계정이 없습니다.' }, { status: 404 })
      }

      if (!existingUser.username_normalized) {
        return NextResponse.json({ error: SOCIAL_LOGIN_MESSAGE }, { status: 409 })
      }
    }

    if (purpose === 'reset_pw') {
      if (!username) {
        return NextResponse.json({ error: '아이디가 필요합니다.' }, { status: 400 })
      }
      const normalizedUsername = normalizeUsername(String(username))
      if (normalizedUsername.length < 6) {
        return NextResponse.json({ error: '아이디는 최소 6자 이상이어야 합니다.' }, { status: 400 })
      }
      const { data: phoneUser } = await supabaseAdmin
        .from('users')
        .select('id, username_normalized')
        .eq('phone', phoneNumber)
        .maybeSingle()

      if (phoneUser && !phoneUser.username_normalized) {
        return NextResponse.json({ error: SOCIAL_LOGIN_MESSAGE }, { status: 409 })
      }

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .eq('username_normalized', normalizedUsername)
        .maybeSingle()

      if (!existingUser) {
        return NextResponse.json({ error: '일치하는 계정이 없습니다.' }, { status: 404 })
      }
    }

    const now = new Date()
    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('phone', phoneNumber)
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
    const { count: dailyCount } = await supabaseAdmin
      .from('auth_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phoneNumber)
      .eq('purpose', purpose)
      .gte('created_at', since)

    const dailyLimit = MAX_DAILY_SENDS[purpose] ?? 20
    if ((dailyCount || 0) >= dailyLimit) {
      return NextResponse.json(
        { error: '최근 24시간 내 인증 시도 횟수를 초과했습니다.' },
        { status: 429 }
      )
    }

    const verificationCode = generateOtpCode()

    let sendSuccess = false
    let sendDetail: string | null = null

    try {
      const result = await sendSMS(phoneNumber, verificationCode)
      sendSuccess = result.success
      sendDetail = result.detail || null
    } catch (smsError: any) {
      console.error('SMS 발송 실패:', smsError)
      return NextResponse.json(
        {
          error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          detail: smsError?.message || 'sms_exception',
        },
        { status: 500 }
      )
    }

    if (!sendSuccess) {
      return NextResponse.json(
        { error: '인증번호 발송에 실패했습니다.', detail: sendDetail || 'sms_failed' },
        { status: 500 }
      )
    }

    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000).toISOString()
    const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('auth_otps')
      .insert({
        phone: phoneNumber,
        purpose,
        code_hash: hashOtp(phoneNumber, verificationCode),
        expires_at: expiresAt,
        attempts: 0,
        resend_available_at: resendAvailableAt,
        locked_until: null,
      })

    if (insertError) {
      return NextResponse.json({ error: '인증번호 저장에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      sentVia: 'sms',
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
    })
  } catch (error: any) {
    console.error('인증번호 발송 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * SMS 발송 (fallback)
 */
async function sendSMS(
  phone: string,
  code: string
): Promise<{ success: boolean; detail?: string }> {
  try {
    const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL
    const SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN

    if (!SMS_SERVICE_URL || !SMS_SERVICE_TOKEN) {
      console.warn('SMS 서비스 설정이 없습니다.')
      return { success: false, detail: 'sms_config_missing' }
    }

    const response = await fetch(`${SMS_SERVICE_URL}/sms/send-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        text: `[대가정육마트] 인증번호 ${code}\n(타인에게 절대 공유하지 마세요)`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('SMS 발송 실패:', errorData)
      return {
        success: false,
        detail: errorData?.error || errorData?.message || `sms_http_${response.status}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('SMS 발송 오류:', error)
    return { success: false, detail: error?.message || 'sms_fetch_error' }
  }
}



