import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_AUTH_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/admin-session-token'

function isAdminSession(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value)
}

/** 로그인·로그아웃·상태 확인은 쿠키 없이 접근 가능 */
function isPublicAdminApi(pathname: string): boolean {
  if (pathname === '/api/admin/login') return true
  if (pathname === '/api/admin/logout') return true
  return false
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!isAdminSession(request)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/admin')) {
    if (isPublicAdminApi(pathname)) {
      return NextResponse.next()
    }
    if (!isAdminSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
