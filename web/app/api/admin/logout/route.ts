import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_AUTH_COOKIE_NAME, getAdminAuthCookieOptions } from '@/lib/auth/admin-session-token'

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_AUTH_COOKIE_NAME, '', {
    ...getAdminAuthCookieOptions(request),
    maxAge: 0,
  })
  return res
}


