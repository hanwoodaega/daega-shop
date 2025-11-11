/**
 * 에러 코드 정의
 */
export enum ErrorCode {
  // 인증 관련
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 데이터 관련
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // 유효성 검증
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  
  // 비즈니스 로직
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  ORDER_NOT_CANCELLABLE = 'ORDER_NOT_CANCELLABLE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  
  // 시스템
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 커스텀 애플리케이션 에러 클래스
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public userMessage?: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    
    // 스택 트레이스 캡처
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * 사용자 친화적 에러 메시지 매핑
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 인증
  [ErrorCode.UNAUTHORIZED]: '로그인이 필요합니다.',
  [ErrorCode.FORBIDDEN]: '권한이 없습니다.',
  [ErrorCode.SESSION_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요.',
  
  // 데이터
  [ErrorCode.NOT_FOUND]: '요청하신 정보를 찾을 수 없습니다.',
  [ErrorCode.ALREADY_EXISTS]: '이미 존재하는 데이터입니다.',
  
  // 유효성
  [ErrorCode.VALIDATION_ERROR]: '입력값을 확인해주세요.',
  [ErrorCode.INVALID_INPUT]: '올바르지 않은 입력입니다.',
  [ErrorCode.REQUIRED_FIELD]: '필수 항목을 입력해주세요.',
  
  // 비즈니스
  [ErrorCode.INSUFFICIENT_STOCK]: '재고가 부족합니다.',
  [ErrorCode.ORDER_NOT_CANCELLABLE]: '취소할 수 없는 주문입니다.',
  [ErrorCode.PAYMENT_FAILED]: '결제에 실패했습니다.',
  [ErrorCode.OUT_OF_STOCK]: '상품이 품절되었습니다.',
  
  // 시스템
  [ErrorCode.DATABASE_ERROR]: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
  [ErrorCode.SERVER_ERROR]: '서버 오류가 발생했습니다.',
  [ErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다.',
}

