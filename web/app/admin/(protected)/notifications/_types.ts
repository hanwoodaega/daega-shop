export interface User {
  id: string
  email?: string | null
  username?: string | null
  name?: string | null
  phone?: string | null
  created_at?: string
  /** 네이버 | 카카오 | 휴대폰 | 기타 */
  signup_method?: string
}

export type NotificationType = 'general' | 'point' | 'review'

export interface NotificationFormData {
  title: string
  content: string
  type: NotificationType
}

