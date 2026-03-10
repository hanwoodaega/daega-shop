/**
 * @deprecated SMS/알림톡은 lib/notifications(중간 서버 경유)로 이전되었습니다.
 * 새 코드는 @/lib/notifications 를 사용하세요. 하위 호환용 re-export만 유지합니다.
 */
export {
  sendSms,
  sendOrderCompleteAlimtalk,
  sendGiftAlimtalk,
  sendGiftNotification,
} from '@/lib/notifications'
export type { SendSmsResult } from '@/lib/notifications'
