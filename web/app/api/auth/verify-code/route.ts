import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { generateToken, hashOtp, hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import { getClientIpFromHeaders, rateLimitOrThrow } from '@/lib/auth/rate-limit'
import { buildServerTimingHeader } from '@/lib/utils/server-timing'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10
const VERIFICATION_TOKEN_MINUTES = 10

/**
 * 인증번호 검증 API
 * POST /api/auth/verify-code
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const ip = getClientIpFromHeaders(request.headers)
    // 인증번호 검증은 brute-force 위험 → 분당 제한
    rateLimitOrThrow({ key: `auth:verify-otp:${ip}`, limit: 30, windowMs: 60_000 })

    const body = await request.json()
    const { phone, code, purpose } = body
    const tParse = Date.now()

    if (!phone || !code || !purpose) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (!['signup', 'find_id', 'reset_pw'].includes(purpose)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const phoneNumber = normalizePhone(phone)
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const now = new Date()

    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('phone', phoneNumber)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const tRead = Date.now()

    if (!latestOtp) {
      const headers = new Headers()
      headers.set(
        'Server-Timing',
        buildServerTimingHeader([
          { name: 'parse', durMs: tParse - t0 },
          { name: 'read', durMs: tRead - tParse },
          { name: 'total', durMs: Date.now() - t0 },
        ])
      )
      return NextResponse.json({ error: '인증번호가 만료되었습니다. 다시 요청해주세요.' }, { status: 400 })
    }

    if (latestOtp.locked_until && new Date(latestOtp.locked_until) > now) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 })
    }

    if (latestOtp.expires_at && new Date(latestOtp.expires_at) < now) {
      return NextResponse.json({ error: '인증번호가 만료되었습니다. 다시 요청해주세요.' }, { status: 400 })
    }

    if ((latestOtp.attempts || 0) >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      await supabaseAdmin
        .from('auth_otps')
        .update({ locked_until: lockedUntil })
        .eq('id', latestOtp.id)
      return NextResponse.json({ error: '인증 시도 횟수를 초과했습니다.' }, { status: 429 })
    }

    const hashedCode = hashOtp(phoneNumber, String(code))
    if (latestOtp.code_hash !== hashedCode) {
      const attempts = (latestOtp.attempts || 0) + 1
      const updateData: any = { attempts }
      if (attempts >= MAX_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      }
      await supabaseAdmin.from('auth_otps').update(updateData).eq('id', latestOtp.id)

      return NextResponse.json({ error: '인증번호가 일치하지 않습니다.' }, { status: 400 })
    }

    const verificationToken = generateToken()
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_MINUTES * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('auth_otps')
      .update({
        verified_at: now.toISOString(),
        verification_token_hash: hashToken(verificationToken),
        verification_expires_at: verificationExpiresAt,
      })
      .eq('id', latestOtp.id)
    const tUpdate = Date.now()

    const headers = new Headers()
    headers.set(
      'Server-Timing',
      buildServerTimingHeader([
        { name: 'parse', durMs: tParse - t0 },
        { name: 'read', durMs: tRead - tParse },
        { name: 'update', durMs: tUpdate - tRead },
        { name: 'total', durMs: tUpdate - t0 },
      ])
    )
    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
      verificationToken,
      expiresIn: VERIFICATION_TOKEN_MINUTES * 60,
    }, { headers })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    console.error('인증번호 검증 오류:', error)
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500, headers })
  }
}



