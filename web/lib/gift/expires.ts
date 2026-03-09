/**
 * 선물 수령 만료일: 보낸 날 기준 7일째 되는 날 23:59:59(KST)까지 유효.
 * "3월 12일까지" = 3월 12일 23:59:59 KST까지 이용 가능하도록 ISO 문자열 반환.
 *
 * - KST 기준 오늘 날짜로 7일 후 23:59:59.999 KST 시점을 UTC로 저장.
 * - 23:59:59 KST = 14:59:59 UTC (KST = UTC+9)
 * - 만료 비교는 API에서 expiresAt < new Date() 로 하면 타임존 무관 동일하게 동작.
 */
export function getGiftExpiresAtEndOfDayKST(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const y = parseInt(parts.find((p) => p.type === 'year')!.value, 10)
  const m = parseInt(parts.find((p) => p.type === 'month')!.value, 10)
  const d = parseInt(parts.find((p) => p.type === 'day')!.value, 10)
  // 7일째 되는 날 23:59:59.999 KST → 14:59:59.999 UTC
  const endOfDay7KST = new Date(Date.UTC(y, m - 1, d + 7, 14, 59, 59, 999))
  return endOfDay7KST.toISOString()
}
