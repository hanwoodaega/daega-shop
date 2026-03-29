import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

/**
 * Unauthorized 에러 처리 헬퍼 함수
 * @param router - Next.js router 인스턴스
 * @param error - 에러 객체
 * @returns Unauthorized인 경우 true, 아니면 false
 */
export function handleUnauthorized(
  router: AppRouterInstance,
  error: any
): boolean {
  if (error?.message === 'UNAUTHORIZED') {
    router.push('/admin/login?next=/admin/gift-management')
    return true
  }
  return false
}

