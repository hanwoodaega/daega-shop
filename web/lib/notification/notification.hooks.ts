import { useEffect, useState, useCallback, useMemo } from 'react'
import { NotificationItem } from './notification.types'
import { fetchNotifications, markAllNotificationsRead } from './notification.service'
import { mutateUnreadCount } from '@/lib/swr'

type Tab = 'general' | 'earned'

interface UseNotificationsOptions {
  userId?: string | null
}

interface UseNotificationsReturn {
  notifications: NotificationItem[]
  loading: boolean
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  filteredNotifications: NotificationItem[]
  unreadCountGeneral: number
  unreadCountEarned: number
  markAllRead: () => void
  error: string | null
  retry: () => void
}

export function useNotifications({ userId }: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch (err) {
      console.error('알림 조회 실패:', err)
      setNotifications([])
      setError(err instanceof Error ? err.message : '알림을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAllRead = useCallback(() => {
    if (!userId || notifications.length === 0) return
    const hasUnread = notifications.some((n) => !n.is_read)
    if (!hasUnread) return

    // fire-and-forget: 실패 시에도 UI는 낙관적으로 갱신
    markAllNotificationsRead().catch((err) => {
      console.error('알림 전체 읽음 처리 실패:', err)
    })
    mutateUnreadCount().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [userId, notifications])

  useEffect(() => {
    return () => {
      markAllRead()
    }
  }, [markAllRead])

  const unreadCountGeneral = useMemo(
    () =>
      notifications.filter((n) => !n.is_read && n.type !== 'point' && n.type !== 'review').length,
    [notifications]
  )

  const unreadCountEarned = useMemo(
    () => notifications.filter((n) => !n.is_read && (n.type === 'point' || n.type === 'review')).length,
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'general') {
      return notifications.filter((n) => n.type !== 'point' && n.type !== 'review')
    }
    if (activeTab === 'earned') {
      return notifications.filter((n) => n.type === 'point' || n.type === 'review')
    }
    return notifications
  }, [notifications, activeTab])

  return {
    notifications,
    loading,
    activeTab,
    setActiveTab,
    filteredNotifications,
    unreadCountGeneral,
    unreadCountEarned,
    markAllRead,
    error,
    retry: loadNotifications,
  }
}


