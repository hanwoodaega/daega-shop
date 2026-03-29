import type { z } from 'zod'
import { API_ERROR_TEXT, apiJsonError } from '@/lib/api/api-errors'

function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  return issue?.message ?? '입력 값이 올바르지 않습니다.'
}

/**
 * Route Handler에서 JSON body를 Zod로 검증한다.
 * 실패 시 400과 공통 에러 본문을 반환한다.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: import('next/server').NextResponse }
> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return {
      ok: false,
      response: apiJsonError(400, {
        error: API_ERROR_TEXT.invalidRequest,
        code: 'INVALID_JSON',
        detail: 'Request body must be valid JSON',
      }),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: apiJsonError(400, {
        error: API_ERROR_TEXT.validation,
        code: 'VALIDATION_ERROR',
        detail: firstZodMessage(result.error),
      }),
    }
  }

  return { ok: true, data: result.data }
}
