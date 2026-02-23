import { NextRequest, NextResponse } from 'next/server'
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
    const { phone, code, allowMerge, name } = body

    if (!phone || !code) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    const phoneNumber = normalizePhone(phone)
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    const existingPhone = await supabaseAdmin
      .from('users')
      .select('id, status')
      .eq('phone', phoneNumber)
      .neq('id', user.id)
      .maybeSingle()

    const existingUser = existingPhone?.data || null
    const isDeletedAccount = existingUser?.status === 'deleted'
    const shouldMerge = Boolean(existingUser) && (allowMerge || isDeletedAccount)

    if (existingUser && !shouldMerge) {
      return NextResponse.json({ error: '이미 가입된 휴대폰 번호입니다.' }, { status: 409 })
    }

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
    let targetUserId = user.id
    let merged = false

    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (existingUser && shouldMerge) {
      targetUserId = existingUser.id
      merged = true

      await supabaseAdmin
        .from('oauth_identities')
        .update({ user_id: targetUserId, updated_at: nowIso })
        .eq('user_id', user.id)

      const { data: targetProfile } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', targetUserId)
        .maybeSingle()

      const updateData: Record<string, string> = { phone_verified_at: nowIso }
      if (!targetProfile?.name && trimmedName) {
        updateData.name = trimmedName
      }
      if (isDeletedAccount) {
        updateData.phone = phoneNumber
        updateData.restored_at = nowIso
      }

      await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', targetUserId)

      // 병합 성공 시 임시 계정 정리 (public.users + auth.users)
      try {
        await supabaseAdmin.from('users').delete().eq('id', user.id)
        const adminAuth: any = supabaseAdmin.auth.admin as any
        if (typeof adminAuth?.deleteUser === 'function') {
          await adminAuth.deleteUser(user.id)
        }
      } catch (cleanupError) {
        console.error('임시 계정 정리 실패:', cleanupError)
      }
    } else {
      const updateData: Record<string, string> = {
        phone: phoneNumber,
        phone_verified_at: nowIso,
      }
      if (trimmedName) {
        updateData.name = trimmedName
      }
      await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', user.id)
    }

    const statusUpdate: Record<string, string> = { status: 'active' }
    if (isDeletedAccount) {
      statusUpdate.restored_at = nowIso
    }
    await supabaseAdmin
      .from('users')
      .update(statusUpdate)
      .eq('id', targetUserId)

    try {
      await issuePhoneVerificationCoupon({ userId: targetUserId, phone: phoneNumber })
    } catch (couponError) {
      console.error('휴대폰 인증 쿠폰 지급 실패:', couponError)
    }

    if (merged) {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      const targetEmail = targetUser?.user?.email
      if (!targetEmail) {
        return NextResponse.json({ error: '계정 연결에 실패했습니다.' }, { status: 500 })
      }
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
        options: {
          redirectTo: `${new URL(request.url).origin}/auth/callback`,
        },
      })
      if (linkError || !linkData?.properties?.hashed_token) {
        return NextResponse.json({ error: '계정 연결에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        merged: true,
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
        verificationToken,
        expiresIn: VERIFICATION_TOKEN_MINUTES * 60,
      })
    }

    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
      verificationToken,
      expiresIn: VERIFICATION_TOKEN_MINUTES * 60,
    })
  } catch (error: any) {
    console.error('휴대폰 인증 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
