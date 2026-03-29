/**
 * 알림/SMS 중간 서버 공통
 * - 고정 IP가 필요한 알리고는 중간 서버에서만 호출. 쇼핑몰은 중간 서버로만 요청.
 * - env: SMS_SERVICE_URL, SMS_SERVICE_TOKEN
 */

import { normalizePhoneLast11, isValidKrMobileDigitLength } from '@/lib/phone/kr'

export interface SmsServiceConfig {
  url: string
  token: string
}

function getEnv(name: string): string {
  const v = process.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

/** 중간 서버 설정 (SMS/알림톡 모두 이 주소로 요청) */
export function getSmsServiceConfig(): SmsServiceConfig | null {
  const url = getEnv('SMS_SERVICE_URL')
  const token = getEnv('SMS_SERVICE_TOKEN')
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

/** 수신번호 정규화 (숫자만 10~11자리) */
export function normalizePhone(value: string): string {
  return normalizePhoneLast11(value)
}

export function isValidPhone(phone: string): boolean {
  return isValidKrMobileDigitLength(normalizePhone(phone))
}

/** 중간 서버 POST (JSON body, Bearer 인증) */
export async function middleServerPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const config = getSmsServiceConfig()
  if (!config) {
    return { ok: false, status: 0, error: 'config_missing' }
  }
  try {
    const res = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    const errorMessage =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
        ? (data as { error: string }).error
        : !res.ok
          ? (data?.message as string) || res.statusText
          : undefined
    return {
      ok: res.ok,
      status: res.status,
      data: data as T,
      error: errorMessage,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, error: msg || 'fetch_error' }
  }
}
