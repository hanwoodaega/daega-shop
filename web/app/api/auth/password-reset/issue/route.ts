import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { generateToken, hashToken, normalizePhone, normalizeUsername } from '@/lib/auth/otp-utils'

const RESET_TOKEN_MINUTES = 10

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, verificationToken, username } = body

    if (!phone || !verificationToken || !username) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const phoneNumber = normalizePhone(phone)
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('verification_token_hash, verification_expires_at')
      .eq('phone', phoneNumber)
      .eq('purpose', 'reset_pw')
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

    const normalizedUsername = normalizeUsername(String(username))
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phoneNumber)
      .eq('username_normalized', normalizedUsername)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ error: '일치하는 계정이 없습니다.' }, { status: 404 })
    }

    const resetToken = generateToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: userProfile.id,
        phone: phoneNumber,
        token_hash: hashToken(resetToken),
        expires_at: expiresAt,
      })

    if (insertError) {
      return NextResponse.json({ error: '재설정 토큰 발급 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      resetToken,
      expiresIn: RESET_TOKEN_MINUTES * 60,
    })
  } catch (error: any) {
    console.error('Reset token issue error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

