import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_AUTH_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/admin-session-token'

function adminTokenFromCookieHeader(header: string | null): string | undefined {
  if (!header) return undefined
  for (const segment of header.split(';')) {
    const eq = segment.indexOf('=')
    if (eq <= 0) continue
    const key = segment.slice(0, eq).trim()
    if (key !== ADMIN_AUTH_COOKIE_NAME) continue
    let value = segment.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    const trimmed = value.trim()
    return trimmed || undefined
  }
  return undefined
}

/** 서버 컴포넌트·레이아웃용 — 실패 시 throw */
export async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value
  if (!verifyAdminSessionToken(token)) {
    const error = new Error('Unauthorized') as Error & { status?: number }
    error.status = 401
    throw error
  }
}

/**
 * Route Handler용 관리자 검증 — 통과 시 null, 실패 시 401 JSON.
 * 모든 /api/admin/* (및 관리자 전용 타 경로)에서 이걸로 통일.
 *
 * `request`를 넘기면 해당 요청의 Cookie 헤더를 우선 사용합니다(App Router에서
 * `cookies()`와 동기화 타이밍 이슈가 있을 때 대비).
 */
export async function ensureAdminApi(request?: NextRequest): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const fromStore = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value?.trim()
  const fromReqParsed = request?.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value?.trim()
  const fromHeader = request ? adminTokenFromCookieHeader(request.headers.get('cookie')) : undefined

  const token = fromStore || fromReqParsed || fromHeader
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

