export interface User {
  id: string
  email?: string
  name?: string
  phone?: string
}

export type NotificationType = 'general' | 'point' | 'review'

export interface NotificationFormData {
  title: string
  content: string
  type: NotificationType
}

