/**
 * 관리자 API는 httpOnly 세션 쿠키(`admin_auth`)로 인증합니다.
 * 브라우저 fetch 기본값과 무관하게 쿠키를 항상 보내도록 통일합니다.
 */
export function adminApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, { ...init, credentials: 'include' })
}
