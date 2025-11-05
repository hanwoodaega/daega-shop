/**
 * 전화번호 포맷팅 유틸리티
 */

/**
 * 전화번호에서 숫자만 추출
 * @param phone - 전화번호 문자열
 * @returns 숫자만 포함된 문자열
 */
export function extractPhoneNumbers(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * 전화번호 표시용 포맷팅 (하이픈 추가)
 * @param phone - 전화번호 문자열 (숫자만 또는 하이픈 포함)
 * @returns 포맷팅된 전화번호 (예: 010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // 숫자만 추출
  const numbers = extractPhoneNumbers(phone)
  
  // 11자리 전화번호 (010-XXXX-XXXX)
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }
  
  // 10자리 전화번호 (02-XXX-XXXX 등)
  if (numbers.length === 10) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  
  // 그 외는 원본 반환
  return phone
}

/**
 * 전화번호 유효성 검사
 * @param phone - 전화번호 문자열
 * @returns 유효한 전화번호인지 여부
 */
export function isValidPhoneNumber(phone: string): boolean {
  const numbers = extractPhoneNumbers(phone)
  
  // 10자리 또는 11자리 숫자
  return /^01[0-9]{8,9}$/.test(numbers)
}



