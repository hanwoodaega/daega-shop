export {
  getSmsServiceConfig,
  normalizePhone,
  isValidPhone,
  middleServerPost,
} from './aligo-core'
export type { SmsServiceConfig } from './aligo-core'

export {
  sendOtpSms,
  sendOrderLookupOtpSms,
  sendSms,
} from './send-sms'
export type { SendSmsResult } from './send-sms'

export {
  sendOrderCompleteAlimtalk,
  sendGiftAlimtalk,
  sendGiftNotification,
} from './send-alimtalk'
export type { SendAlimtalkResult } from './send-alimtalk'

export { getOtpMessage, getOrderLookupOtpMessage } from './templates'
