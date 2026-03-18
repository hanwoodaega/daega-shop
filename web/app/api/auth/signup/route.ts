import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone, normalizeUsername, usernameToEmail } from '@/lib/auth/otp-utils'
import { issuePhoneVerificationCoupon } from '@/lib/coupon/coupon-issue.server'
import { getClientIpFromHeaders, rateLimitOrThrow } from '@/lib/auth/rate-limit'
import { buildServerTimingHeader } from '@/lib/utils/server-timing'

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const ip = getClientIpFromHeaders(request.headers)
    rateLimitOrThrow({ key: `auth:signup:${ip}`, limit: 20, windowMs: 60_000 })

    const body = await request.json()
    const { username, password, name, phone, verificationToken, terms } = body
    const tParse = Date.now()

    if (!username || !password || !name || !phone || !verificationToken) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: '비밀번호는 최소 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('verification_token_hash, verification_expires_at')
      .eq('phone', normalizedPhone)
      .eq('purpose', 'signup')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const tOtp = Date.now()

    if (!latestOtp?.verification_token_hash) {
      return NextResponse.json({ error: '인증 정보가 없습니다.' }, { status: 400 })
    }

    if (latestOtp.verification_expires_at && new Date(latestOtp.verification_expires_at) < new Date()) {
      return NextResponse.json({ error: '인증 정보가 만료되었습니다.' }, { status: 400 })
    }

    if (latestOtp.verification_token_hash !== hashToken(verificationToken)) {
      return NextResponse.json({ error: '인증 정보가 올바르지 않습니다.' }, { status: 400 })
    }

    const trimmedUsername = String(username).trim()
    const normalizedUsername = normalizeUsername(trimmedUsername)
    if (trimmedUsername.length < 6) {
      return NextResponse.json({ error: '아이디는 최소 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const { data: existingPhone } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()
    const tPhoneCheck = Date.now()

    if (existingPhone) {
      return NextResponse.json({ error: '이미 가입된 휴대폰 번호입니다.' }, { status: 409 })
    }

    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle()
    const tUserCheck = Date.now()

    if (existingUsername) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
    }

    const email = usernameToEmail(trimmedUsername)

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        provider: 'phone',
        username: trimmedUsername,
        name,
        phone: normalizedPhone,
      },
    })
    const tCreateUser = Date.now()

    if (createError || !createdUser?.user) {
      return NextResponse.json({ error: createError?.message || '회원가입에 실패했습니다.' }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: createdUser.user.id,
        name,
        phone: normalizedPhone,
        phone_verified_at: nowIso,
        username: trimmedUsername,
        username_normalized: normalizedUsername,
        status: 'active',
      }, { onConflict: 'id' })
    const tUpsert = Date.now()

    if (profileError) {
      const message = String(profileError.message || '')
      const code = String(profileError.code || '')
      if (code === '23505' || message.includes('unique')) {
        if (message.includes('users_phone_unique')) {
          return NextResponse.json({ error: '이미 가입된 휴대폰 번호입니다.' }, { status: 409 })
        }
        if (message.includes('users_username_unique') || message.includes('users_username_normalized_unique')) {
          return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
        }
      }
      const detail = process.env.NODE_ENV === 'development' && message
        ? `회원정보 저장 실패 (${message})`
        : '회원정보 저장 실패'
      return NextResponse.json({ error: detail }, { status: 500 })
    }

    if (terms && typeof terms === 'object') {
      const termsTypes = ['service', 'privacy', 'third_party', 'age14', 'marketing']
      const now = new Date().toISOString()
      const termsRecords = termsTypes.map((termsType) => {
        const agreed = terms[termsType] === true
        return {
          user_id: createdUser.user.id,
          terms_type: termsType,
          agreed,
          agreed_at: agreed ? now : null,
        }
      })

      const { error: termsError } = await supabaseAdmin
        .from('user_terms')
        .upsert(termsRecords, { onConflict: 'user_id,terms_type' })
      const tTerms = Date.now()

      if (termsError) {
        console.error('약관 동의 저장 실패:', termsError)
        return NextResponse.json({ error: '약관 동의 저장에 실패했습니다.' }, { status: 500 })
      }
      // keep timing mark if terms existed
      void tTerms
    }

    try {
      await issuePhoneVerificationCoupon({ userId: createdUser.user.id, phone: normalizedPhone })
    } catch (couponError) {
      console.error('휴대폰 인증 쿠폰 지급 실패:', couponError)
    }
    const tCoupon = Date.now()

    const headers = new Headers()
    headers.set(
      'Server-Timing',
      buildServerTimingHeader([
        { name: 'parse', durMs: tParse - t0 },
        { name: 'otp', durMs: tOtp - tParse },
        { name: 'phone', durMs: tPhoneCheck - tOtp },
        { name: 'user', durMs: tUserCheck - tPhoneCheck },
        { name: 'create', durMs: tCreateUser - tUserCheck },
        { name: 'upsert', durMs: tUpsert - tCreateUser },
        { name: 'coupon', durMs: tCoupon - tUpsert },
        { name: 'total', durMs: tCoupon - t0 },
      ])
    )
    return NextResponse.json({ success: true }, { headers })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    console.error('Signup error:', error)
    const headers = new Headers()
    headers.set('Server-Timing', buildServerTimingHeader([{ name: 'total', durMs: Date.now() - t0 }]))
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500, headers })
  }
}

