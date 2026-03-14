/**
 * 쿠폰 만료 시점: 유효한 마지막 날 다음날 00:00:00(KST).
 * 예: 오늘이 10일이면 3일 유효 → 13일까지 사용 가능, 14일 00:00부터 만료.
 * 만료 체크는 now >= expires_at 로 하면 됨.
 */
export function getCouponExpiresAtEndOfDayKST(validityDays: number, fromDate?: Date): string {
  const base = fromDate ? new Date(fromDate) : new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(base)
  const y = parseInt(parts.find((p) => p.type === 'year')!.value, 10)
  const m = parseInt(parts.find((p) => p.type === 'month')!.value, 10)
  const d = parseInt(parts.find((p) => p.type === 'day')!.value, 10)
  // (발급일 + validity_days) 일 15:00 UTC = 그다음날 00:00 KST (만료 시점)
  const expiresAt = new Date(Date.UTC(y, m - 1, d + validityDays, 15, 0, 0, 0))
  return expiresAt.toISOString()
}
