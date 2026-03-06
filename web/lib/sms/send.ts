/**
 * SMS 발송 (알리고 등 동일 엔드포인트 사용)
 * - 인증번호: send-verification-code에서 /sms/send-otp 사용
 * - 일반 문자(주문 완료 등): /sms/send 사용 (find-id와 동일)
 */

export interface SendSmsResult {
  success: boolean
  detail?: string
}

/**
 * 일반 SMS 발송 (POST ${SMS_SERVICE_URL}/sms/send)
 * @param phone - 수신 번호 (숫자만 10~11자리)
 * @param text - 발송 내용
 */
export async function sendSms(phone: string, text: string): Promise<SendSmsResult> {
  const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL
  const SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN

  if (!SMS_SERVICE_URL || !SMS_SERVICE_TOKEN) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'sms_config_missing' }
  }

  try {
    const response = await fetch(`${SMS_SERVICE_URL}/sms/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: phone, text }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[SMS] 발송 실패:', response.status, errorData)
      return {
        success: false,
        detail: errorData?.error || errorData?.message || `http_${response.status}`,
      }
    }

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    console.error('[SMS] 발송 예외:', err?.message || error)
    return { success: false, detail: err?.message || 'fetch_error' }
  }
}

/**
 * 주문 완료 안내 문자 발송
 * - 실패해도 예외 전파하지 않음 (주문 완료는 유지)
 */
export async function sendOrderCompleteSms(
  phone: string,
  orderNumber: string,
  orderLookupUrl: string
): Promise<void> {
  const text = `[대가] 주문이 접수되었습니다.
주문번호: ${orderNumber}
주문조회: ${orderLookupUrl}`
  const result = await sendSms(phone, text)
  if (!result.success) {
    console.error('[SMS] 주문 완료 문자 발송 실패:', result.detail, { orderNumber, phone: phone.slice(0, 3) + '****' })
  }
}
