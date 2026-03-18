import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizeUsername, usernameToEmail } from '@/lib/auth/otp-utils'
import { getClientIpFromHeaders, rateLimitOrThrow } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromHeaders(request.headers)
    rateLimitOrThrow({ key: `auth:resolve-username:${ip}`, limit: 60, windowMs: 60_000 })

    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ error: '아이디를 입력해주세요.' }, { status: 400 })
    }

    const normalized = normalizeUsername(String(username))
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, status')
      .eq('username_normalized', normalized)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: '아이디 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: '로그인 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (user.status !== 'active' && user.status !== 'pending' && user.status !== 'deleted') {
      return NextResponse.json({ error: '로그인 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ email: usernameToEmail(normalized), status: user.status })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

