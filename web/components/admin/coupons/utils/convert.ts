/**
 * 문자열 또는 숫자를 숫자로 변환하는 유틸 함수
 * 빈 문자열 → null
 * 숫자 → number
 * 잘못된 값 → null
 */
export function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (str === '') return null
  const num = Number(str)
  return isNaN(num) ? null : num
}

