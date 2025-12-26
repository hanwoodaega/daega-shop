import { NotificationItem } from './notification.types'

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch('/api/notifications')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '알림 조회 실패')
  }
  const data = await res.json()
  return data.notifications || []
}

export async function markAllNotificationsRead() {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mark_all_read: true }),
    keepalive: true,
  }).catch(() => {})
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count')
  const data = await res.json().catch(() => ({}))
  if (res.ok && typeof data.count === 'number') {
    return data.count
  }
  return 0
}


