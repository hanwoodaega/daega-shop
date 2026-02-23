import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone, normalizeUsername, usernameToEmail } from '@/lib/auth/otp-utils'
import { issuePhoneVerificationCoupon } from '@/lib/coupon/coupon-issue.server'

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, phone, verificationToken, terms } = body

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

    if (existingPhone) {
      return NextResponse.json({ error: '이미 가입된 휴대폰 번호입니다.' }, { status: 409 })
    }

    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle()

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

    if (createError || !createdUser?.user) {
      return NextResponse.json({ error: createError?.message || '회원가입에 실패했습니다.' }, { status: 500 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: createdUser.user.id,
        name,
        phone: normalizedPhone,
        username: trimmedUsername,
        username_normalized: normalizedUsername,
        status: 'active',
      }, { onConflict: 'id' })

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

      if (termsError) {
        console.error('약관 동의 저장 실패:', termsError)
        return NextResponse.json({ error: '약관 동의 저장에 실패했습니다.' }, { status: 500 })
      }
    }

    try {
      await issuePhoneVerificationCoupon({ userId: createdUser.user.id, phone: normalizedPhone })
    } catch (couponError) {
      console.error('휴대폰 인증 쿠폰 지급 실패:', couponError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

