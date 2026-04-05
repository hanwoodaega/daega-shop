import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ADMIN_AUTH_COOKIE_NAME,
  getAdminAuthCookieOptions,
  signAdminSession,
  verifyAdminSessionToken,
} from '@/lib/auth/admin-session-token'
import { checkAdminLoginRateLimit, getClientIp } from '@/lib/auth/admin-rate-limit'

// GET: 관리자 인증 상태 확인
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value
  const authenticated = verifyAdminSessionToken(token)
  return NextResponse.json({ authenticated })
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = await checkAdminLoginRateLimit(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: '시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: rl.retryAfterSec
          ? { 'Retry-After': String(rl.retryAfterSec) }
          : undefined,
      }
    )
  }

  const { password } = await request.json().catch(() => ({ password: '' }))
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin password not set' }, { status: 500 })
  }

  if (typeof password !== 'string' || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  let token: string
  try {
    token = signAdminSession()
  } catch (e) {
    console.error('[admin login] sign session:', e)
    return NextResponse.json(
      {
        error:
          '관리자 세션 설정 오류입니다. ADMIN_SESSION_SECRET(프로덕션에서 32자 이상)을 확인하세요.',
      },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_AUTH_COOKIE_NAME, token, getAdminAuthCookieOptions(request))
  return res
}
