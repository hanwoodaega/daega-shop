/**
 * 한국 시간(KST) 관련 유틸리티 함수
 * 모든 시간 처리를 한국 시간 기준으로 통일
 */

/**
 * 현재 UTC 시간을 ISO 문자열로 반환
 * 
 * DB가 UTC 기준이므로 그대로 비교
 * 한국 기준 판단은 입력/표시(UI)에서만 처리
 */
export function getNowUTCISO(): string {
  return new Date().toISOString()
}

/**
 * 현재 시간을 Date 객체로 반환 (비교용)
 * 
 * @deprecated getNowUTCISO() 사용 권장
 */
export function getKSTNow(): Date {
  return new Date()
}

/**
 * datetime-local 형식(로컬 시간)을 ISO 8601 형식(UTC)으로 변환
 * 프론트엔드에서 입력받은 한국 시간을 UTC로 변환하여 저장
 */
export function convertLocalToISO(localDateTime: string): string {
  if (!localDateTime) return ''
  // datetime-local은 타임존 정보가 없으므로, 브라우저가 로컬 시간으로 해석
  // new Date()는 로컬 시간으로 해석하고, toISOString()은 UTC로 변환
  const localDate = new Date(localDateTime)
  return localDate.toISOString()
}

/**
 * UTC 시간을 로컬 시간으로 변환하여 datetime-local 형식으로 반환
 * 데이터베이스에서 가져온 UTC 시간을 한국 시간으로 표시
 */
export function convertUTCToLocal(utcDateTime: string): string {
  if (!utcDateTime) return ''
  const utcDate = new Date(utcDateTime)
  // datetime-local 형식으로 변환 (로컬 시간대 사용)
  const year = utcDate.getFullYear()
  const month = String(utcDate.getMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getDate()).padStart(2, '0')
  const hours = String(utcDate.getHours()).padStart(2, '0')
  const minutes = String(utcDate.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * 한국 시간 기준으로 날짜를 YYYY-MM-DD 문자열로 변환
 * 
 * 주의: 날짜 문자열만 필요할 때 사용 (타임딜 비교 로직에는 사용하지 않음)
 */
export function getKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

