import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, maskUsername, normalizePhone } from '@/lib/auth/otp-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/find-id
 * 휴대폰 OTP 확인 후 아이디(마스킹) 조회
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, verificationToken } = body

    if (!phone || !verificationToken) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const phoneNumber = normalizePhone(phone)

    const { data: latestOtp } = await supabaseAdmin
      .from('auth_otps')
      .select('verification_token_hash, verification_expires_at')
      .eq('phone', phoneNumber)
      .eq('purpose', 'find_id')
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

    // 휴대폰 번호로 사용자 조회
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('username, created_at')
      .eq('phone', phoneNumber)

    if (error) {
      console.error('Find ID error:', error)
      return NextResponse.json({ error: '정보 조회 중 오류가 발생했습니다.' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '일치하는 사용자 정보가 없습니다.' }, { status: 404 })
    }

    const foundUsers = users.map((user) => ({
      username: maskUsername(user.username),
      created_at: user.created_at,
    }))

    return NextResponse.json({ users: foundUsers })
  } catch (error: any) {
    console.error('Find ID exception:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

