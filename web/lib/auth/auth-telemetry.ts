 'use client'

type AuthTelemetryEvent =
  | {
      type: 'oauth_session_check'
      provider: 'kakao' | 'naver'
      session_found: boolean
      used_fallback: boolean
      duration_ms: number
    }
  | {
      type: 'background_finalize'
      provider: 'kakao' | 'naver' | 'google' | 'password' | 'unknown'
      success: boolean
      redirect_to?: string
      duration_ms: number
    }

export async function sendAuthTelemetry(event: AuthTelemetryEvent) {
  try {
    const body = JSON.stringify({ event, ts: Date.now() })
    const url = '/api/auth/telemetry'
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
      return
    }
    await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // telemetry 실패는 무시
  }
}
