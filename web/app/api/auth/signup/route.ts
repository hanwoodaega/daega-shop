import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone, normalizeUsername, usernameToEmail } from '@/lib/auth/otp-utils'

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, phone, verificationToken } = body

    if (!username || !password || !phone || !verificationToken) {
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
    if (trimmedUsername.length < 4) {
      return NextResponse.json({ error: '아이디는 최소 4자 이상이어야 합니다.' }, { status: 400 })
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
        username: trimmedUsername,
        name: name || null,
        phone: normalizedPhone,
      },
    })

    if (createError || !createdUser?.user) {
      return NextResponse.json({ error: createError?.message || '회원가입에 실패했습니다.' }, { status: 500 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: createdUser.user.id,
        email,
        name: name || null,
        phone: normalizedPhone,
        username: trimmedUsername,
        username_normalized: normalizedUsername,
        status: 'active',
      })

    if (profileError) {
      return NextResponse.json({ error: '회원정보 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

