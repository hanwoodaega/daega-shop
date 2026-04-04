/**
 * 알림톡 (카카오) — 현재 서비스에서 사용하지 않음.
 * 예전 공개 API와의 호환을 위해 함수는 유지하며, 호출 시 네트워크 요청 없이 즉시 성공 처리합니다.
 */

export interface SendAlimtalkResult {
  success: boolean
  detail?: string
}

/** @deprecated 알림톡 미발송 */
export async function sendOrderCompleteAlimtalk(_params: {
  to: string
  orderNumber: string
  productName: string
}): Promise<SendAlimtalkResult> {
  return { success: true, detail: 'alimtalk_disabled' }
}

/** @deprecated 알림톡 미발송 */
export async function sendGiftAlimtalk(_params: {
  to: string
  recipientName?: string
  senderName: string
  message: string | null
  productName: string
  token: string
  receiveUrl: string
  expiresAtFormatted: string
}): Promise<SendAlimtalkResult> {
  return { success: true, detail: 'alimtalk_disabled' }
}

/** @deprecated 알림톡 미발송 */
export async function sendGiftNotification(
  _params: Parameters<typeof sendGiftAlimtalk>[0]
): Promise<void> {
  void _params
}
