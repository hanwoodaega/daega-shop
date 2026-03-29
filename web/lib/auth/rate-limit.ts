/**
 * 프로세스 메모리 기반 rate limit (서버리스/다중 인스턴스에서는 인스턴스별로 따로 동작).
 * OTP 등 중요 경로를 여러 리전에서 막으려면 Upstash 등 외부 저장과 병행하는 것을 검토하세요.
 * (관리자 로그인은 `admin-rate-limit.ts`에서 Upstash 옵션 지원)
 */
type Bucket = { count: number; resetAt: number }

const getStore = (): Map<string, Bucket> => {
  const g = globalThis as any
  if (!g.__daega_rate_limit_store) {
    g.__daega_rate_limit_store = new Map<string, Bucket>()
  }
  return g.__daega_rate_limit_store as Map<string, Bucket>
}

export function getClientIpFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return headers.get('x-real-ip') || 'unknown'
}

export function rateLimitOrThrow(input: {
  key: string
  limit: number
  windowMs: number
}): { remaining: number; resetAt: number } {
  const store = getStore()
  const now = Date.now()
  const existing = store.get(input.key)
  const resetAt = existing && existing.resetAt > now ? existing.resetAt : now + input.windowMs
  const count = existing && existing.resetAt > now ? existing.count + 1 : 1

  const bucket: Bucket = { count, resetAt }
  store.set(input.key, bucket)

  const remaining = Math.max(0, input.limit - bucket.count)
  if (bucket.count > input.limit) {
    const err: any = new Error('rate_limited')
    err.code = 'rate_limited'
    err.resetAt = bucket.resetAt
    throw err
  }

  return { remaining, resetAt: bucket.resetAt }
}

