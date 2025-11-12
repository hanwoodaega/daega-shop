import toast from 'react-hot-toast'

/**
 * API 에러를 일관되게 처리하는 유틸리티
 */
export function handleApiError(error: any, context: string) {
  console.error(`[${context}]`, error)
  
  // 개발 환경에서는 상세 에러 메시지 표시
  if (process.env.NODE_ENV === 'development') {
    toast.error(`${context}: ${error.message || '알 수 없는 오류'}`, {
      duration: 4000,
    })
  } else {
    // 프로덕션에서는 사용자 친화적 메시지
    toast.error('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', {
      duration: 3000,
    })
  }
}

/**
 * 성공 메시지를 일관되게 표시
 */
export function showSuccessMessage(message: string) {
  toast.success(message, {
    icon: '✅',
    duration: 2000,
  })
}

/**
 * 정보 메시지를 표시
 */
export function showInfoMessage(message: string) {
  toast(message, {
    icon: 'ℹ️',
    duration: 3000,
  })
}

/**
 * fetch 응답을 검증하고 에러 처리
 */
export async function handleFetchResponse(response: Response, context: string) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || errorData.message || `${context} 실패`
    throw new Error(errorMessage)
  }
  return response.json()
}
