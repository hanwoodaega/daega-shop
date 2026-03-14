/**
 * 선물 수령 만료 시점: 보낸 날(KST) 기준 7일 유효 → 8일째 00:00:00(KST)부터 만료.
 * 쿠폰과 동일하게 "만료되는 날 00:00" 저장, 만료 비교는 now >= expires_at.
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
  // (보낸 날 + 7)일 00:00 KST = (d+6)일 15:00 UTC
  const expiresAt = new Date(Date.UTC(y, m - 1, d + 6, 15, 0, 0, 0))
  return expiresAt.toISOString()
}
