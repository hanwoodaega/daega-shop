import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { getUserFromServer } from '@/lib/auth/auth-server'
import { generateToken, hashOtp, hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import { issuePhoneVerificationCoupon } from '@/lib/coupon/coupon-issue.server'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10
const VERIFICATION_TOKEN_MINUTES = 10

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromServer()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, code, name } = body

    if (!phone || !code) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
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
      .eq('purpose', 'verify_phone')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestOtp) {
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
      const updateData: { attempts: number; locked_until?: string } = { attempts }
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

    const nowIso = now.toISOString()
    const targetUserId = user.id

    const trimmedName = typeof name === 'string' ? name.trim() : ''

    const profilePayload: Record<string, string> = {
      id: targetUserId,
      phone: phoneNumber,
      phone_verified_at: nowIso,
      status: 'active',
      updated_at: nowIso,
    }
    if (trimmedName) {
      profilePayload.name = trimmedName
    }
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(profilePayload, { onConflict: 'id' })
    if (upsertError) {
      console.error('사용자 정보 업데이트 실패:', upsertError)
      const errorMessage = upsertError?.message || ''
      if (errorMessage.includes('users_phone_unique')) {
        return NextResponse.json(
          { error: '이미 사용 중인 휴대폰 번호입니다.' },
          { status: 409 }
        )
      }
      const detail = errorMessage ? ` (${errorMessage})` : ''
      throw new Error(`사용자 정보 업데이트에 실패했습니다.${detail}`)
    }

    try {
      await issuePhoneVerificationCoupon({ userId: targetUserId, phone: phoneNumber })
    } catch (couponError) {
      console.error('휴대폰 인증 쿠폰 지급 실패:', couponError)
    }

    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
      verificationToken,
      expiresIn: VERIFICATION_TOKEN_MINUTES * 60,
    })
  } catch (error: unknown) {
    return unknownErrorResponse('auth/verify-phone', error)
  }
}
