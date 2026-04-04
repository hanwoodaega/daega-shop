import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken, normalizePhone } from '@/lib/auth/otp-utils'
import {
  FIND_ID_NO_PHONE_ACCOUNT_MESSAGE,
  listUsersEligibleForFindId,
} from '@/lib/auth/find-id-phone-users'
import { sendFindIdSms } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/find-id
 * 휴대폰 OTP 확인 후 아이디 안내 문자 발송 (마스킹은 SMS 중간 서버)
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

    const eligible = await listUsersEligibleForFindId(supabaseAdmin, phoneNumber)
    if (eligible.length === 0) {
      return NextResponse.json({ error: FIND_ID_NO_PHONE_ACCOUNT_MESSAGE }, { status: 404 })
    }

    const sortedUsers = [...eligible].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime
    })
    const username = sortedUsers[0]?.username || ''

    const smsResult = await sendFindIdSms({
      phone: phoneNumber,
      userId: username,
    })

    if (!smsResult.success) {
      console.error('Find ID SMS error:', smsResult.detail)
      return NextResponse.json({ error: '문자 발송에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Find ID exception:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

