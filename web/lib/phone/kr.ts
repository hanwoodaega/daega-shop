/**
 * 국내 전화번호 규칙 단일 모듈.
 * - OTP/DB 조회: `phoneDigitsOnly` (기존 otp-utils `normalizePhone`과 동일)
 * - 주문조회 수령인 매칭: `normalizePhoneForOrderMatch`
 * - SMS/알리고 수신: `normalizePhoneLast11`
 * - 저장·payload: `sanitizePhoneDigits`
 * - 클라이언트 인증번호: `sanitizeOtpCodeInput` · 기타 숫자만+길이: `digitsOnlyMax`
 */

/** 휴대폰 국번호(01x…) 기준 최대 숫자 자릿수 */
export const KOREAN_MOBILE_MAX_DIGITS = 11

/** 비숫자 제거만 (길이 제한 없음). OTP HMAC, 사용자 조회 등 */
export function phoneDigitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * 주문조회·수령인 연락처 비교용 (마지막 11자리 + 10자리 번호 앞 0 보정)
 */
export function normalizePhoneForOrderMatch(value: string): string {
  return phoneDigitsOnly(value).slice(-11).padStart(10, '0').slice(0, KOREAN_MOBILE_MAX_DIGITS)
}

/**
 * SMS/알리고 등 발송 수신번호: 끝에서 11자리 (pad 없음)
 */
export function normalizePhoneLast11(value: string): string {
  return phoneDigitsOnly(value).slice(-KOREAN_MOBILE_MAX_DIGITS).slice(0, KOREAN_MOBILE_MAX_DIGITS)
}

/**
 * DB·API payload 저장용: 숫자만, 앞에서 maxLen자리 (기본 11)
 */
export function sanitizePhoneDigits(value: string, maxLen: number = KOREAN_MOBILE_MAX_DIGITS): string {
  return phoneDigitsOnly(value).slice(0, maxLen)
}

/** 카카오 등 +82 로 오는 번호를 0 시작 국내 형태로 */
export function normalizeKakaoStylePhoneToKrDigits(value?: string | null): string | null {
  if (value == null || value === '') return null
  let digits = phoneDigitsOnly(value)
  if (digits.startsWith('82') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`
  }
  return digits
}

/** 인증번호(OTP) 등 숫자만, 최대 maxLen자리 */
export function digitsOnlyMax(value: string | null | undefined, maxLen: number): string {
  return phoneDigitsOnly(value).slice(0, maxLen)
}

/** SMS 인증번호 입력 (6자리) */
export const OTP_CODE_LENGTH = 6
export function sanitizeOtpCodeInput(value: string): string {
  return digitsOnlyMax(value, OTP_CODE_LENGTH)
}

/** OTP/인증 플로우: 숫자만 10~11자리 여부 */
export function isValidKrMobileDigitLength(digits: string): boolean {
  return digits.length >= 10 && digits.length <= KOREAN_MOBILE_MAX_DIGITS
}

/** 01x 휴대폰 패턴 (숫자만 입력 기준) */
export function isValidKrMobilePattern(numbers: string): boolean {
  return /^01[0-9]{8,9}$/.test(numbers)
}
