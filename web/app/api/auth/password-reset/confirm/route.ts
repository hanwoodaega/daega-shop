import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { hashToken } from '@/lib/auth/otp-utils'

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resetToken, newPassword } = body

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: '비밀번호는 최소 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const tokenHash = hashToken(resetToken)

    const { data: tokenRow } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: '토큰이 만료되었습니다.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(tokenRow.user_id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message || '비밀번호 변경 실패' }, { status: 500 })
    }

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRow.id)

    try {
      const adminAuth: any = supabaseAdmin.auth.admin
      if (adminAuth?.invalidateUserSessions) {
        await adminAuth.invalidateUserSessions(tokenRow.user_id)
      } else if (adminAuth?.signOut) {
        await adminAuth.signOut(tokenRow.user_id)
      }
    } catch (e) {
      // 세션 무효화 실패는 무시
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

