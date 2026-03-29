import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_AUTH_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/admin-session-token'

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
 */
export async function ensureAdminApi(): Promise<NextResponse | null> {
  try {
    await assertAdmin()
    return null
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

