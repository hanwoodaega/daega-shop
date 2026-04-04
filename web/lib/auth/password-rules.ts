/** 회원가입 비밀번호 정책 (영문·숫자 필수, 길이) */

export const PASSWORD_MIN_LEN = 8
export const PASSWORD_MAX_LEN = 20

/** 라벨 옆 안내 문구 */
export const SIGNUP_PASSWORD_HINT = '(영어, 숫자 포함 8자 이상)'

/** 정책 미충족 시 (인라인·API 오류) */
export const SIGNUP_PASSWORD_INVALID_MESSAGE = '비밀번호가 적합하지 않습니다.'

/** 비밀번호·비밀번호 확인 불일치 */
export const SIGNUP_PASSWORD_MISMATCH_MESSAGE = '비밀번호가 일치하지 않습니다.'

const HAS_LETTER = /[a-zA-Z]/
const HAS_DIGIT = /[0-9]/

export function isValidSignupPassword(password: string): boolean {
  if (typeof password !== 'string') return false
  const len = password.length
  if (len < PASSWORD_MIN_LEN || len > PASSWORD_MAX_LEN) return false
  if (!HAS_LETTER.test(password)) return false
  if (!HAS_DIGIT.test(password)) return false
  return true
}
