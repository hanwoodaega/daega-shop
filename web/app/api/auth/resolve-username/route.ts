import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { usernameToEmail } from '@/lib/auth/otp-utils'
import {
  canonicalUsername,
  isValidUsername,
  USERNAME_RULES_MESSAGE,
} from '@/lib/auth/username-rules'
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

    const u = canonicalUsername(username)
    if (!isValidUsername(u)) {
      return NextResponse.json({ error: USERNAME_RULES_MESSAGE }, { status: 400 })
    }
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, status')
      .eq('username', u)
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

    return NextResponse.json({ email: usernameToEmail(u), status: user.status })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    return unknownErrorResponse('auth/resolve-username', error)
  }
}

