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
 * 선물 알림톡 발송 (알리고 등)
 * - 결제 완료 후 받는 분 휴대폰으로 발송
 * - 템플릿: [대가정육마트] #{보낸사람}님이 선물을 보냈습니다. / 상품: #{상품명} / 메시지: #{메시지} / 선물 기한: #{유효기간}까지
 * - 버튼 링크: https://thedaega.com/gift/receive/#{token} 형태로 등록 후 token만 전달
 */
export interface SendGiftAlimtalkParams {
  to: string
  senderName: string
  message: string | null
  productName: string
  /** 선물 토큰 (알리고 버튼 URL 변수 #{token}) */
  token: string
  /** 선물 수령 페이지 전체 URL (SMS fallback용) */
  receiveUrl: string
  /** 유효기간 표시용 (예: "3월 12일") - gift_expires_at 기준 */
  expiresAtFormatted: string
}

export async function sendGiftAlimtalk(params: SendGiftAlimtalkParams): Promise<SendSmsResult> {
  const { to, senderName, message, productName, token, receiveUrl, expiresAtFormatted } = params
  const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL
  const SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN

  if (!SMS_SERVICE_URL || !SMS_SERVICE_TOKEN) {
    console.warn('[Alimtalk] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'sms_config_missing' }
  }

  const phone = String(to).replace(/\D/g, '').slice(0, 11)
  if (phone.length < 10) {
    return { success: false, detail: 'invalid_phone' }
  }

  try {
    const response = await fetch(`${SMS_SERVICE_URL}/alimtalk/send-gift`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        sender_name: senderName,
        message: message || '',
        product_name: productName,
        token,
        expires_at: expiresAtFormatted,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Alimtalk] 선물 알림톡 발송 실패:', response.status, errorData)
      return {
        success: false,
        detail: errorData?.error || errorData?.message || `http_${response.status}`,
      }
    }

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    console.error('[Alimtalk] 선물 알림톡 예외:', err?.message || error)
    return { success: false, detail: err?.message || 'fetch_error' }
  }
}

/**
 * 선물 알림톡 발송
 * - 알림톡 실패 시 문자 발송은 알리고/템플릿 쪽에서 처리하므로 여기서는 발송만 요청하고 로그만 남김
 */
export async function sendGiftNotification(
  params: SendGiftAlimtalkParams
): Promise<void> {
  const result = await sendGiftAlimtalk(params)
  if (!result.success) {
    console.error('[Alimtalk] 선물 알림톡 발송 실패 (문자 fallback은 알리고 템플릿에서 처리):', result.detail)
  }
}

/**
 * 주문 완료 알림톡 발송 (비회원 주문)
 * - 본문: [대가정육마트] 주문이 접수되었습니다. ■ 상품명: #{상품명} ■ 주문번호: #{주문번호} 주문해주셔서 감사합니다.
 * - 상품명: 가장 비싼 상품명 외 N개 (선물 템플릿과 동일)
 * - 버튼: 고정 URL https://thedaega.com/o
 */
export interface SendOrderCompleteAlimtalkParams {
  to: string
  orderNumber: string
  productName: string
}

export async function sendOrderCompleteAlimtalk(
  params: SendOrderCompleteAlimtalkParams
): Promise<SendSmsResult> {
  const { to, orderNumber, productName } = params
  const SMS_SERVICE_URL = process.env.SMS_SERVICE_URL
  const SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN

  if (!SMS_SERVICE_URL || !SMS_SERVICE_TOKEN) {
    console.warn('[Alimtalk] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'sms_config_missing' }
  }

  const phone = String(to).replace(/\D/g, '').slice(0, 11)
  if (phone.length < 10) {
    return { success: false, detail: 'invalid_phone' }
  }

  try {
    const response = await fetch(`${SMS_SERVICE_URL}/alimtalk/send-order-complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        order_number: orderNumber,
        product_name: productName,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Alimtalk] 주문 완료 알림톡 발송 실패:', response.status, errorData)
      return {
        success: false,
        detail: errorData?.error || errorData?.message || `http_${response.status}`,
      }
    }

    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    console.error('[Alimtalk] 주문 완료 알림톡 예외:', err?.message || error)
    return { success: false, detail: err?.message || 'fetch_error' }
  }
}

