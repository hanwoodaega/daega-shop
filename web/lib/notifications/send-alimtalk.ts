/**
 * 알림톡 발송 (중간 서버 경유 → 중간 서버가 알리고 카카오 알림톡 호출)
 * - 주문 완료, 선물받기
 */

import {
  getSmsServiceConfig,
  normalizePhone,
  isValidPhone,
  middleServerPost,
} from './aligo-core'

export interface SendAlimtalkResult {
  success: boolean
  detail?: string
}

/**
 * 주문 완료 알림톡 (회원/비회원 구분 없이, 수령인 연락처로 발송)
 * - 중간 서버 POST /alimtalk/send-order-complete
 * - 실패 시 대체 문자는 중간 서버(알리고)에서 처리
 */
export async function sendOrderCompleteAlimtalk(params: {
  to: string
  orderNumber: string
  productName: string
}): Promise<SendAlimtalkResult> {
  console.log('[ALIMTALK] start')
  const config = getSmsServiceConfig()
  console.log('[ALIMTALK] config exists:', !!config)
  if (!config) {
    console.warn('[Alimtalk] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(params.to)
  console.log('[ALIMTALK] phone:', to)
  console.log('[ALIMTALK] payload:', {
    to,
    order_number: params.orderNumber,
    product_name: params.productName,
  })
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const result = await middleServerPost('/alimtalk/send-order-complete', {
    to,
    order_number: params.orderNumber,
    product_name: params.productName,
  })

  console.log('[ALIMTALK] response:', result)

  if (result.ok) {
    return { success: true }
  }
  console.error('[Alimtalk] 주문 완료 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/**
 * 선물받기 알림톡
 * - 중간 서버 POST /alimtalk/send-gift
 * - 템플릿 문구:
 *   [대가정육마트]
 *   #{받는사람}님, #{보낸사람}님이 선물을 보냈어요!
 *   상품 : #{상품명}
 *   메시지 "#{메시지}"
 *   선물을 확인하고 배송받을 주소를 입력해주세요.
 *   ※ 선물 기한 : #{유효기간}까지
 */
export async function sendGiftAlimtalk(params: {
  to: string
  /** 받는 사람 이름 (템플릿 #{받는사람}, 없으면 중간 서버에서 '고객' 등 처리) */
  recipientName?: string
  senderName: string
  message: string | null
  productName: string
  token: string
  receiveUrl: string
  expiresAtFormatted: string
}): Promise<SendAlimtalkResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[Alimtalk] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(params.to)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const result = await middleServerPost('/alimtalk/send-gift', {
    to,
    recipient_name: params.recipientName ?? '',
    sender_name: params.senderName,
    message: params.message || '',
    product_name: params.productName,
    token: params.token,
    expires_at: params.expiresAtFormatted,
  })

  if (result.ok) {
    return { success: true }
  }
  console.error('[Alimtalk] 선물 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/** 선물 알림톡 발송 (실패 시 로그만, fallback은 중간 서버에서 처리) */
export async function sendGiftNotification(
  params: Parameters<typeof sendGiftAlimtalk>[0]
): Promise<void> {
  const result = await sendGiftAlimtalk(params)
  if (!result.success) {
    console.error('[Alimtalk] 선물 알림톡 발송 실패 (문자 fallback은 중간 서버에서 처리):', result.detail)
  }
}
