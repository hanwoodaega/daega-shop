import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/** In-memory fallback when Upstash env is not set (single-instance / dev). */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>()
const MEMORY_WINDOW_MS = 60_000
const MEMORY_MAX = 15

let upstashRatelimit: Ratelimit | null | undefined

function getUpstashRatelimit(): Ratelimit | null {
  if (upstashRatelimit !== undefined) return upstashRatelimit
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    upstashRatelimit = null
    return null
  }
  const redis = new Redis({ url, token })
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:admin-login',
    analytics: false,
  })
  return upstashRatelimit
}

function checkMemory(ip: string): { success: boolean; retryAfterSec?: number } {
  const now = Date.now()
  let b = memoryBuckets.get(ip)
  if (!b || now > b.resetAt) {
    memoryBuckets.set(ip, { count: 1, resetAt: now + MEMORY_WINDOW_MS })
    return { success: true }
  }
  if (b.count >= MEMORY_MAX) {
    return { success: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }
  b.count += 1
  return { success: true }
}

export function getClientIp(request: NextRequest): string {
  const h = request.headers
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

/** Limit admin login attempts per IP. Uses Upstash when configured, else in-memory. */
export async function checkAdminLoginRateLimit(
  ip: string
): Promise<{ success: boolean; retryAfterSec?: number }> {
  const rl = getUpstashRatelimit()
  if (rl) {
    const result = await rl.limit(ip)
    if (!result.success) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      )
      return { success: false, retryAfterSec }
    }
    return { success: true }
  }
  const m = checkMemory(ip)
  return { success: m.success, retryAfterSec: m.retryAfterSec }
}
