import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_AUTH_COOKIE_NAME = 'admin_auth'

const TOKEN_VERSION = 2 as const
const DEFAULT_MAX_AGE_SEC = 60 * 60 * 8

export type AdminTokenPayload = {
  v: typeof TOKEN_VERSION
  iat: number
  exp: number
}

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET?.trim()
  if (s && s.length >= 32) return s
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_SESSION_SECRET must be set to a string at least 32 characters long in production'
    )
  }
  return (
    s ||
    'dev-only-insecure-admin-session-secret-min-32-chars'
  )
}

/** Issue a signed admin session token (HMAC-SHA256 over base64url payload). */
export function signAdminSession(options?: { maxAgeSec?: number }): string {
  const secret = getSecret()
  const now = Math.floor(Date.now() / 1000)
  const maxAge = options?.maxAgeSec ?? DEFAULT_MAX_AGE_SEC
  const full: AdminTokenPayload = {
    v: TOKEN_VERSION,
    iat: now,
    exp: now + maxAge,
  }
  const payloadB64 = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest()
  const sigB64 = sig.toString('base64url')
  return `${payloadB64}.${sigB64}`
}

/** Sync verification for Route Handlers, Server Components, and proxy. */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sigB64] = parts
  let secret: string
  try {
    secret = getSecret()
  } catch {
    return false
  }
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest()
  let providedSig: Buffer
  try {
    providedSig = Buffer.from(sigB64, 'base64url')
  } catch {
    return false
  }
  if (expectedSig.length !== providedSig.length || !timingSafeEqual(expectedSig, providedSig)) {
    return false
  }
  let parsed: AdminTokenPayload
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return false
  }
  if (parsed.v !== TOKEN_VERSION) return false
  const now = Math.floor(Date.now() / 1000)
  if (typeof parsed.exp !== 'number' || parsed.exp <= now) return false
  if (typeof parsed.iat !== 'number') return false
  return true
}

export function adminSessionCookieMaxAgeSec(): number {
  return DEFAULT_MAX_AGE_SEC
}

/** 배포 뒤 프록시(예: Vercel)의 HTTPS 종단 여부 */
export function isRequestHttps(request: Pick<Request, 'headers' | 'url'>): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')
  if (forwarded) {
    return forwarded.split(',')[0].trim() === 'https'
  }
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 프로덕션에서도 HTTP로 접속하면 Secure 쿠키는 브라우저가 저장하지 않음
 * (로컬 `next start` + http://localhost 등). 연결이 실제 HTTPS일 때만 Secure.
 */
export function getAdminAuthCookieOptions(request?: Pick<Request, 'headers' | 'url'>) {
  const secure =
    process.env.NODE_ENV === 'production' &&
    (request ? isRequestHttps(request) : true)
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: DEFAULT_MAX_AGE_SEC,
  }
}
