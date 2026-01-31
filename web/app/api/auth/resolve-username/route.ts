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
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('email, status')
      .eq('username_normalized', normalized)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: '아이디 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: '로그인 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ email: user.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

