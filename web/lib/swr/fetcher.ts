/**
 * 공통 fetcher: credentials 포함, 401/403/500 및 JSON 파싱 실패 방어
 */

export class FetcherError extends Error {
  status?: number
  body?: unknown
  constructor(message: string, status?: number, body?: unknown) {
    super(message)
    this.name = 'FetcherError'
    this.status = status
    this.body = body
  }
}

/** 401: 미인증, 403: 권한 없음, 500: 서버 오류 등 공통 처리 */
export async function defaultFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' })
  let body: unknown = null
  const contentType = res.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  if (isJson) {
    try {
      body = await res.json()
    } catch {
      throw new FetcherError('응답 파싱에 실패했습니다.', res.status, null)
    }
  } else {
    try {
      body = await res.text()
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    const message = (() => {
      if (body && typeof body === 'object') {
        const o = body as { error?: unknown; detail?: unknown; details?: unknown }
        if (typeof o.detail === 'string' && o.detail.trim()) return o.detail
        if (typeof o.details === 'string' && o.details.trim()) return o.details
        if (typeof o.error === 'string' && o.error.trim()) return o.error
      }
      if (res.status === 401) return '로그인이 필요합니다.'
      if (res.status === 403) return '접근 권한이 없습니다.'
      if (res.status >= 500) return '일시적인 오류가 발생했습니다.'
      return res.statusText || '요청에 실패했습니다.'
    })()
    throw new FetcherError(message, res.status, body)
  }

  return body as T
}
