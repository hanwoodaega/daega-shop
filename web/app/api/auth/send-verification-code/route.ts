import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { generateOtpCode, hashOtp, normalizePhone } from '@/lib/auth/otp-utils'
import {
  canonicalUsername,
  isValidUsername,
  USERNAME_RULES_MESSAGE,
} from '@/lib/auth/username-rules'
import { sendOtpSms } from '@/lib/notifications'
import { getClientIpFromHeaders, rateLimitOrThrow } from '@/lib/auth/rate-limit'
import {
  FIND_ID_NO_PHONE_ACCOUNT_MESSAGE,
  listUsersEligibleForFindId,
} from '@/lib/auth/find-id-phone-users'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { buildServerTimingHeader } from '@/lib/utils/server-timing'

const OTP_EXPIRES_MINUTES = 3
const RESEND_COOLDOWN_SECONDS = 60
const MAX_DAILY_SENDS: Record<string, number> = {
  find_id: 10,
  reset_pw: 10,
  signup: 100, //20
  verify_phone: 100, //20
}
const LOCK_MINUTES = 10

/**
 * 인증번호 발송 API (SMS)
 * POST /api/auth/send-verification-code
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const ip = getClientIpFromHeaders(request.headers)
    // OTP 발송은 남용 위험이 커서 더 타이트하게 제한
    rateLimitOrThrow({ key: `auth:send-otp:${ip}`, limit: 20, windowMs: 60_000 })

    const body = await request.json()
    const { phone, purpose, username } = body
    const tParse = Date.now()

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
    const tClient = Date.now()

    if (purpose === 'signup' || purpose === 'verify_phone') {
      if (purpose === 'verify_phone') {
        const user = await getUserFromServer()
        if (!user) {
          return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
        }
      }

      if (username) {
        const u = canonicalUsername(username)
        if (!isValidUsername(u)) {
          return NextResponse.json({ error: USERNAME_RULES_MESSAGE }, { status: 400 })
        }
        const { data: existingUsername } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', u)
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
      const eligible = await listUsersEligibleForFindId(supabaseAdmin, phoneNumber)
      if (eligible.length === 0) {
        return NextResponse.json({ error: FIND_ID_NO_PHONE_ACCOUNT_MESSAGE }, { status: 404 })
      }
    }

    if (purpose === 'reset_pw') {
      if (!username) {
        return NextResponse.json({ error: '아이디가 필요합니다.' }, { status: 400 })
      }
      const u = canonicalUsername(username)
      if (!isValidUsername(u)) {
        return NextResponse.json({ error: USERNAME_RULES_MESSAGE }, { status: 400 })
      }

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .eq('username', u)
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
    const tReadOtp = Date.now()

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
      const result = await sendOtpSms(phoneNumber, verificationCode)
      sendSuccess = result.success
      sendDetail = result.detail || null
    } catch (smsError: any) {
      console.error('SMS 발송 실패:', smsError)
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'parse', durMs: tParse - t0 },
          { name: 'db', durMs: tReadOtp - tClient },
          { name: 'sms', durMs: Date.now() - tReadOtp },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json(
        {
          error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          detail: smsError?.message || 'sms_exception',
        },
        { status: 500, headers }
      )
    }
    const tSms = Date.now()

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
    const tInsert = Date.now()

    if (insertError) {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'parse', durMs: tParse - t0 },
          { name: 'db', durMs: tReadOtp - tClient },
          { name: 'sms', durMs: tSms - tReadOtp },
          { name: 'insert', durMs: tInsert - tSms },
          { name: 'total', durMs: tInsert - t0 },
        ])
      )
      return NextResponse.json({ error: '인증번호 저장에 실패했습니다.' }, { status: 500, headers })
    }

    const headers = new Headers()
    headers.set(
      'Server-Timing',
      buildServerTimingHeader([
        { name: 'parse', durMs: tParse - t0 },
        { name: 'db', durMs: tReadOtp - tClient },
        { name: 'sms', durMs: tSms - tReadOtp },
        { name: 'insert', durMs: tInsert - tSms },
        { name: 'total', durMs: tInsert - t0 },
      ])
    )
    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      sentVia: 'sms',
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
    }, { headers })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return unknownErrorResponse('auth/send-verification-code', error, headers)
  }
}



