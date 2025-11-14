import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET: 관리자 인증 상태 확인
export async function GET() {
  const cookieStore = cookies()
  const cookie = cookieStore.get('admin_auth')
  
  if (!cookie || cookie.value !== '1') {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  
  return NextResponse.json({ authenticated: true })
}

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin password not set' }, { status: 500 })
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return res
}


