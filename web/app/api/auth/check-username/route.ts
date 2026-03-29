import { NextRequest, NextResponse } from 'next/server'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizeUsername } from '@/lib/auth/otp-utils'
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
    if (error?.code === 'rate_limited') {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }
    return unknownErrorResponse('auth/check-username', error)
  }
}
