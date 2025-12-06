'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const router = useRouter()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    } catch (error) {
      console.error('알림 개수 조회 실패:', error)
    }
  }

  // 알림 페이지로 이동
  const handleClick = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    router.push('/notifications')
  }

  // 주기적으로 읽지 않은 개수 갱신
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    fetchUnreadCount()
    
    // 30초마다 갱신
    const interval = setInterval(fetchUnreadCount, 30000)
    
    // 실시간 구독 (선택사항)
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        handleClick()
      }}
      className="p-2 hover:bg-gray-100 rounded-full transition relative z-30"
      aria-label="알림"
    >
      <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

