/** Auth `user_metadata.provider` / `app_metadata.provider` — 카카오·네이버·휴대폰(아이디) 가입 */

export type SignupMethodCode = 'naver' | 'kakao' | 'phone' | 'other'

export function signupMethodCodeFromAuthUser(user: {
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
  identities?: Array<{ provider?: string }> | null
}): SignupMethodCode {
  let raw = String(user.user_metadata?.provider ?? user.app_metadata?.provider ?? '').toLowerCase()
  if (!raw && user.identities?.length) {
    raw = String(user.identities[0]?.provider ?? '').toLowerCase()
  }
  if (!raw) raw = 'phone'
  if (raw === 'kakao') return 'kakao'
  if (raw === 'naver') return 'naver'
  if (raw === 'phone' || raw === 'email') return 'phone'
  return 'other'
}

export function signupMethodLabelKo(code: SignupMethodCode): string {
  switch (code) {
    case 'naver':
      return '네이버'
    case 'kakao':
      return '카카오'
    case 'phone':
      return '휴대폰'
    default:
      return '기타'
  }
}
