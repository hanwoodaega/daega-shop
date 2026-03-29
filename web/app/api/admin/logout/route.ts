import { NextResponse } from 'next/server'
import { ADMIN_AUTH_COOKIE_NAME } from '@/lib/auth/admin-session-token'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}


