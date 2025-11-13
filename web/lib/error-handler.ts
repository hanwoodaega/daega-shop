import { AppError, ErrorCode, ERROR_MESSAGES } from './errors'
import toast from 'react-hot-toast'

/**
 * Supabase 에러를 AppError로 변환
 */
export function handleSupabaseError(error: any): AppError {
  // 인증 에러
  if (error.message?.includes('JWT') || 
      error.message?.includes('auth') ||
      error.message?.includes('not authenticated')) {
    return new AppError(
      ErrorCode.UNAUTHORIZED,
      error.message,
      ERROR_MESSAGES[ErrorCode.UNAUTHORIZED],
      401
    )
  }
  
  // 권한 에러
  if (error.message?.includes('permission') || 
      error.message?.includes('policy')) {
    return new AppError(
      ErrorCode.FORBIDDEN,
      error.message,
      ERROR_MESSAGES[ErrorCode.FORBIDDEN],
      403
    )
  }
  
  // 중복 키 에러
  if (error.code === '23505' || error.message?.includes('duplicate')) {
    return new AppError(
      ErrorCode.ALREADY_EXISTS,
      error.message,
      ERROR_MESSAGES[ErrorCode.ALREADY_EXISTS],
      409
    )
  }
  
  // Not found
  if (error.code === 'PGRST116') {
    return new AppError(
      ErrorCode.NOT_FOUND,
      error.message,
      ERROR_MESSAGES[ErrorCode.NOT_FOUND],
      404
    )
  }
  
  // 외래 키 제약 위반
  if (error.code === '23503') {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      error.message,
      '참조 무결성 오류가 발생했습니다.',
      400
    )
  }
  
  // 기본 데이터베이스 에러
  return new AppError(
    ErrorCode.DATABASE_ERROR,
    error.message || 'Database error',
    ERROR_MESSAGES[ErrorCode.DATABASE_ERROR],
    500,
    error
  )
}

/**
 * 네트워크 에러 처리
 */
export function handleNetworkError(error: any): AppError {
  if (error.message?.includes('fetch') || 
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch')) {
    return new AppError(
      ErrorCode.NETWORK_ERROR,
      error.message,
      ERROR_MESSAGES[ErrorCode.NETWORK_ERROR],
      503
    )
  }
  
  if (error.name === 'AbortError') {
    return new AppError(
      ErrorCode.NETWORK_ERROR,
      'Request timeout',
      '요청 시간이 초과되었습니다. 다시 시도해주세요.',
      408
    )
  }
  
  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    error.message || 'Unknown error',
    ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
    500
  )
}

/**
 * 클라이언트 에러 표시 (toast)
 */
export function showError(error: unknown, options?: { duration?: number; icon?: string }) {
  let appError: AppError
  
  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    appError = handleNetworkError(error)
  } else {
    appError = new AppError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]
    )
  }
  
  // 사용자에게 친화적 메시지 표시
  toast.error(appError.userMessage || appError.message, {
    icon: options?.icon || '❌',
    duration: options?.duration || 4000,
  })
  
  // 개발 환경에서는 상세 로그
  if (process.env.NODE_ENV === 'development') {
    console.group('🔴 Error Details')
    console.error('Code:', appError.code)
    console.error('Message:', appError.message)
    console.error('User Message:', appError.userMessage)
    console.error('Status:', appError.statusCode)
    console.error('Details:', appError.details)
    console.error('Stack:', appError.stack)
    console.groupEnd()
  }
  
  return appError
}

/**
 * API 응답 에러 처리
 */
export async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ 
      error: '서버 오류가 발생했습니다.' 
    }))
    
    // 에러 코드가 있으면 사용
    const errorCode: ErrorCode = data.code || (
      response.status === 401 ? ErrorCode.UNAUTHORIZED :
      response.status === 403 ? ErrorCode.FORBIDDEN :
      response.status === 404 ? ErrorCode.NOT_FOUND :
      ErrorCode.UNKNOWN_ERROR
    )
    
    throw new AppError(
      errorCode,
      data.error || 'API 요청 실패',
      data.error || ERROR_MESSAGES[errorCode as ErrorCode],
      response.status,
      data
    )
  }
  
  return response.json()
}

/**
 * 성공 메시지 표시
 */
export function showSuccess(message: string, options?: { duration?: number; icon?: string }) {
  toast.success(message, {
    icon: options?.icon || '✅',
    duration: options?.duration || 3000,
  })
}

/**
 * 정보 메시지 표시
 */
export function showInfo(message: string, options?: { duration?: number; icon?: string }) {
  toast(message, {
    icon: options?.icon || 'ℹ️',
    duration: options?.duration || 3000,
  })
}

