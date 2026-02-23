import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizeUsername } from '@/lib/auth/otp-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ error: '아이디를 입력해주세요.' }, { status: 400 })
    }

    const normalized = normalizeUsername(String(username))
    if (normalized.length < 6) {
      return NextResponse.json({ error: '아이디는 최소 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username_normalized', normalized)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: '아이디 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      available: !existingUser,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
