/**
 * SMS 발송 (중간 서버 경유 → 중간 서버가 알리고 호출)
 * - OTP, 일반 문자
 */

import { getSmsServiceConfig, normalizePhone, isValidPhone, middleServerPost } from './aligo-core'
import { getOtpMessage, getOrderLookupOtpMessage } from './templates'

export interface SendSmsResult {
  success: boolean
  detail?: string
}

/**
 * OTP 인증번호 SMS 발송 (회원가입/아이디찾기/비밀번호찾기/전화번호인증 등)
 */
export async function sendOtpSms(phone: string, code: string): Promise<SendSmsResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(phone)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const text = getOtpMessage(code)
  const result = await middleServerPost('/sms/send-otp', { to, text })

  if (result.ok) {
    return { success: true }
  }
  console.error('[SMS] OTP 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/**
 * 주문조회용 OTP SMS 발송
 */
export async function sendOrderLookupOtpSms(phone: string, code: string): Promise<SendSmsResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(phone)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const text = getOrderLookupOtpMessage(code)
  const result = await middleServerPost('/sms/send-otp', { to, text })

  if (result.ok) {
    return { success: true }
  }
  console.error('[SMS] 주문조회 OTP 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/**
 * 주문 완료 SMS 발송
 */
export async function sendOrderCompleteSms(params: {
  phone: string
  orderNumber: string
}): Promise<SendSmsResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(params.phone)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const result = await middleServerPost('/sms/send-order-complete', {
    to,
    order_number: params.orderNumber,
  })

  if (result.ok) {
    return { success: true }
  }
  console.error('[SMS] 주문 완료 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/**
 * 아이디 찾기 안내 문자 (중간 서버 /sms/send-find-id → 문구·마스킹은 서버에서 처리)
 */
export async function sendFindIdSms(params: { phone: string; userId: string }): Promise<SendSmsResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(params.phone)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const user_id = String(params.userId || '').trim()
  if (!user_id) {
    return { success: false, detail: 'missing_user_id' }
  }

  const result = await middleServerPost('/sms/send-find-id', { to, user_id })

  if (result.ok) {
    return { success: true }
  }
  console.error('[SMS] 아이디 찾기 문자 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}

/**
 * 일반 문자 발송
 */
export async function sendSms(phone: string, text: string, _title?: string): Promise<SendSmsResult> {
  const config = getSmsServiceConfig()
  if (!config) {
    console.warn('[SMS] 설정 없음: SMS_SERVICE_URL, SMS_SERVICE_TOKEN')
    return { success: false, detail: 'config_missing' }
  }

  const to = normalizePhone(phone)
  if (!isValidPhone(to)) {
    return { success: false, detail: 'invalid_phone' }
  }

  const result = await middleServerPost('/sms/send', { to, text })

  if (result.ok) {
    return { success: true }
  }
  console.error('[SMS] 발송 실패:', result.status, result.error)
  return {
    success: false,
    detail: result.error || `http_${result.status}`,
  }
}
