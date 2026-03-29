import { cookies } from 'next/headers'
import { ADMIN_AUTH_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/admin-session-token'

/** Route handlers that prefer a boolean check instead of throwing. */
export async function hasValidAdminCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifyAdminSessionToken(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value)
}

export async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value
  if (!verifyAdminSessionToken(token)) {
    const error = new Error('Unauthorized') as Error & { status?: number }
    error.status = 401
    throw error
  }
}

