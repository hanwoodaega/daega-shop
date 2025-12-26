import { useEffect, useState, useCallback, useMemo } from 'react'
import { NotificationItem } from './notification.types'
import { fetchNotifications, markAllNotificationsRead } from './notification.service'

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
}

export function useNotifications({ userId }: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('알림 조회 실패:', error)
      setNotifications([])
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

    // fire-and-forget
    markAllNotificationsRead()
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
  }
}


