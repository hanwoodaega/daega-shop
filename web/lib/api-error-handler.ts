import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AppError, ErrorCode } from './errors'

/**
 * API 라우트 핸들러 래퍼 (에러 처리 자동화)
 */
export function withErrorHandler<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<T | NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const result = await handler(request, context)
      
      // 이미 NextResponse면 그대로 반환
      if (result instanceof NextResponse) {
        return result
      }
      
      // 아니면 JSON으로 변환
      return NextResponse.json(result)
    } catch (error) {
      console.error('❌ API Error:', error)
      
      // AppError 처리
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            error: error.userMessage || error.message,
            code: error.code,
            ...(process.env.NODE_ENV === 'development' && {
              details: error.details,
              stack: error.stack,
            }),
          },
          { status: error.statusCode }
        )
      }
      
      // 예상치 못한 에러
      return NextResponse.json(
        {
          error: '서버 오류가 발생했습니다.',
          code: ErrorCode.UNKNOWN_ERROR,
          ...(process.env.NODE_ENV === 'development' && {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 인증 검증 헬퍼
 */
export function requireAuth(userId?: string | null): string {
  if (!userId) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      'Authentication required',
      '로그인이 필요합니다.',
      401
    )
  }
  return userId
}

/**
 * 관리자 권한 검증 헬퍼
 */
export function requireAdmin(isAdmin: boolean) {
  if (!isAdmin) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      'Admin access required',
      '관리자 권한이 필요합니다.',
      403
    )
  }
}

/**
 * 유효성 검증 헬퍼
 */
export function validateRequired(data: any, fields: string[]) {
  const missing = fields.filter(field => 
    data[field] === undefined || 
    data[field] === null || 
    data[field] === ''
  )
  
  if (missing.length > 0) {
    throw new AppError(
      ErrorCode.REQUIRED_FIELD,
      `Missing required fields: ${missing.join(', ')}`,
      `필수 항목을 입력해주세요: ${missing.join(', ')}`,
      400,
      { missing }
    )
  }
}

