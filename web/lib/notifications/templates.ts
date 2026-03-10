/**
 * SMS/알림톡 문구 (OTP 등)
 * - 템플릿 코드·fallback은 중간 서버에서 관리
 */

/** OTP 문자 본문 (SMS) */
export function getOtpMessage(code: string, brandName = '대가정육마트'): string {
  return `[${brandName}] 인증번호 ${code}\n(타인에게 절대 공유하지 마세요)`
}

/** 주문조회 OTP 문자 본문 */
export function getOrderLookupOtpMessage(code: string, brandName = '대가정육마트'): string {
  return `[${brandName}] 주문조회 인증번호는 ${code}입니다.\n(타인에게 공유하지 마세요)`
}
