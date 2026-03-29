import { NextResponse } from 'next/server'

/**
 * API Route Handler 공통 에러 본문.
 * - 클라이언트: `error`(사람이 읽을 요약) + 선택적 `detail`(검증 필드 등)
 * - `code`: 프론트/로깅용 구분 (선택)
 * 내부 원인(Supabase 메시지, 스택)은 응답에 넣지 않고 `logApiError`로만 남긴다.
 */
export type ApiErrorBody = {
  error: string
  code?: string
  detail?: string
}

export const API_ERROR_TEXT = {
  server: '요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
  invalidRequest: '요청 형식이 올바르지 않습니다.',
  validation: '입력값을 확인해주세요.',
} as const

export function logApiError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[api] ${context}`, err.message, err.stack)
  } else {
    console.error(`[api] ${context}`, err)
  }
}

export function apiJsonError(status: number, body: ApiErrorBody): NextResponse {
  return NextResponse.json(body, { status })
}

/** 5xx: 로그 남기고 클라이언트에는 고정 문구만 */
export function serverErrorResponse(
  context: string,
  err: unknown,
  status = 500,
  headers?: HeadersInit
): NextResponse {
  logApiError(context, err)
  return NextResponse.json(
    { error: API_ERROR_TEXT.server, code: 'SERVER_ERROR' },
    { status, headers }
  )
}

/**
 * catch 블록에서 알 수 없는 Error → 안전한 500 응답 (메시지 노출 없음)
 * `headers`: CORS 등 기존 라우트와 동일한 응답 헤더가 필요할 때만 전달
 */
export function unknownErrorResponse(
  context: string,
  err: unknown,
  headers?: HeadersInit
): NextResponse {
  return serverErrorResponse(context, err, 500, headers)
}

/**
 * PostgREST / Postgres 코드 기반으로 클라이언트용 메시지·상태만 반환 (원본 message는 로깅용으로만 사용)
 */
export function mapDbErrorForClient(err: { code?: string; message?: string } | null | undefined): {
  status: number
  body: ApiErrorBody
} {
  if (!err) {
    return {
      status: 500,
      body: { error: API_ERROR_TEXT.server, code: 'SERVER_ERROR' },
    }
  }

  const code = err.code
  const msg = err.message ?? ''

  if (code === 'PGRST116') {
    return {
      status: 404,
      body: { error: '요청하신 정보를 찾을 수 없습니다.', code: 'NOT_FOUND' },
    }
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    return {
      status: 409,
      body: { error: '이미 존재하는 데이터입니다.', code: 'CONFLICT' },
    }
  }
  if (code === '23503') {
    return {
      status: 400,
      body: { error: '연관된 데이터를 확인할 수 없습니다.', code: 'FK_VIOLATION' },
    }
  }
  if (code === '22P02' || code === '23514') {
    return {
      status: 400,
      body: { error: API_ERROR_TEXT.validation, code: 'INVALID_DATA' },
    }
  }
  if (code === '42501' || /permission denied|RLS/i.test(msg)) {
    return {
      status: 403,
      body: { error: '권한이 없습니다.', code: 'FORBIDDEN' },
    }
  }

  return {
    status: 500,
    body: { error: API_ERROR_TEXT.server, code: 'DATABASE_ERROR' },
  }
}

export function dbErrorResponse(
  context: string,
  err: { code?: string; message?: string } | null | undefined
): NextResponse {
  logApiError(context, err)
  const { status, body } = mapDbErrorForClient(err)
  return apiJsonError(status, body)
}
