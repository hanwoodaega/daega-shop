/**
 * 아이디(username) 단일 컬럼 규칙.
 * - 저장값: 영문 소문자, 숫자만 (공백·특수문자 불가)
 * - 길이: 6~20자
 */

export const USERNAME_MIN_LEN = 6
export const USERNAME_MAX_LEN = 20

/** 허용 문자 1글자 (소문자·숫자) */
const ALLOWED = /^[a-z0-9]$/

/** 최종 저장/조회용 형식 검증 */
export const USERNAME_REGEX = new RegExp(
  `^[a-z0-9]{${USERNAME_MIN_LEN},${USERNAME_MAX_LEN}}$`
)

/**
 * 입력 시: 공백·대문자·허용되지 않은 문자 제거 후 소문자로 통일
 */
export function sanitizeUsernameInput(raw: string): string {
  return String(raw)
    .trim()
    .toLowerCase()
    .split('')
    .filter((c) => ALLOWED.test(c))
    .join('')
    .slice(0, USERNAME_MAX_LEN)
}

/** trim + sanitize (API에서 body 받을 때) */
export function canonicalUsername(raw: unknown): string {
  return sanitizeUsernameInput(String(raw ?? ''))
}

export function isValidUsername(value: string): boolean {
  if (!value) return false
  return USERNAME_REGEX.test(value)
}

export const USERNAME_RULES_MESSAGE = '아이디 형식이 올바르지 않습니다.'
