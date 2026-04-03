import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import {
  canonicalUsername,
  isValidUsername,
  USERNAME_RULES_MESSAGE,
} from '@/lib/auth/username-rules'
import { getClientIpFromHeaders, rateLimitOrThrow } from '@/lib/auth/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromHeaders(request.headers)
    rateLimitOrThrow({ key: `auth:check-username:${ip}`, limit: 60, windowMs: 60_000 })

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
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', u)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: '아이디 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      available: !existingUser,
    })
  } catch (error: any) {
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    return unknownErrorResponse('auth/check-username', error)
  }
}
