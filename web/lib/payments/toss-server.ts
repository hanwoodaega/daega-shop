/**
 * 토스 결제 서버 유틸 (취소 등)
 */

/**
 * 토스 결제 전액 취소 API 호출
 * @returns 성공 시 { ok: true }, 실패 시 { ok: false, error: string }
 */
export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string
): Promise<{ ok: boolean; error?: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    console.warn('[toss-server] TOSS_SECRET_KEY 없음')
    return { ok: false, error: '결제 취소 설정이 없습니다.' }
  }
  const auth = Buffer.from(`${secretKey}:`).toString('base64')
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const msg = errBody?.message || errBody?.code || res.statusText
      console.error('[toss-server] 토스 취소 실패:', res.status, msg)
      return { ok: false, error: msg || '결제 취소에 실패했습니다.' }
    }
    return { ok: true }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    console.error('[toss-server] 토스 취소 요청 예외:', err)
    return { ok: false, error: '결제 취소 요청 중 오류가 발생했습니다.' }
  }
}
