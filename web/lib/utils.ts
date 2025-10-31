/**
 * 공통 유틸리티 함수
 */

/**
 * 숫자를 한국어 형식의 가격 문자열로 변환
 * @param price 가격
 * @returns 포맷된 가격 문자열 (예: "1,234,567")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price)
}

