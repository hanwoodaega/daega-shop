/**
 * 전화번호 포맷팅 (표시·입력). 숫자 규칙은 `@/lib/phone/kr`와 동일.
 */

import {
  KOREAN_MOBILE_MAX_DIGITS,
  phoneDigitsOnly,
  isValidKrMobilePattern,
} from '@/lib/phone/kr'

export { KOREAN_MOBILE_MAX_DIGITS } from '@/lib/phone/kr'

/** 하이픈 포함 표시 시 입력창 maxLength (예: 010-1234-5678) */
export const KOREAN_PHONE_INPUT_MAX_LENGTH = 13

/**
 * 전화번호에서 숫자만 추출 (길이 제한 없음)
 */
export function extractPhoneNumbers(phone: string): string {
  return phoneDigitsOnly(phone)
}

/**
 * 입력 필드 onChange용: 숫자만 남기고 최대 11자리 (휴대폰)
 */
export function parsePhoneInput(value: string): string {
  return phoneDigitsOnly(value).slice(0, KOREAN_MOBILE_MAX_DIGITS)
}

/**
 * 완성된 번호 표시용 (저장값·목록 등)
 * @param phone - 전화번호 문자열 (숫자만 또는 하이픈 포함)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  const numbers = extractPhoneNumbers(phone)

  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }

  if (numbers.length === 10) {
    if (numbers.startsWith('02')) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  return phone
}

/**
 * 입력 중인 전화번호 표시용 (하이픈 자동 삽입, 부분 입력 지원)
 * 010 → 010, 0101 → 010-1, 01012345678 → 010-1234-5678
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  const n = parsePhoneInput(phone)
  if (n.length <= 3) return n
  // 02 지역번호 (10자리)
  if (n.startsWith('02')) {
    if (n.length <= 6) return `${n.slice(0, 2)}-${n.slice(2)}`
    return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6, 10)}`
  }
  // 01x 휴대폰 (11자리)
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}`
}

/**
 * 전화번호 유효성 검사
 */
export function isValidPhoneNumber(phone: string): boolean {
  return isValidKrMobilePattern(phoneDigitsOnly(phone))
}
