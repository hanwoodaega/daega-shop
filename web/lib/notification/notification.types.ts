export type NotificationType = string

export interface NotificationItem {
  id: string
  title: string
  content: string
  type: NotificationType
  is_read: boolean
  created_at: string
}


