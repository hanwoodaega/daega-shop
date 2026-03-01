'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/supabase'

export default function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const channelRef = useRef<any>(null)

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    try {
      const res = await fetch('/api/notifications/unread-count')
      
      if (!res.ok) {
        // 서버 에러는 조용히 처리 (4xx, 5xx 등)
        return
      }
      
      const data = await res.json()
      
      if (typeof data.count === 'number') {
        setUnreadCount(data.count)
      }
    } catch (error) {
      // 네트워크 에러 (연결 실패 등)는 조용히 처리
      // 서버가 시작 중이거나 일시적으로 연결할 수 없는 상황은 정상적인 동작
      // UI는 기존 값을 유지하거나 0으로 설정하지 않음
    }
  }

  // 알림 페이지로 이동
  const handleClick = () => {
    if (!user) {
      const next = encodeURIComponent(pathname || '/')
      router.push(`/auth/login?next=${next}`)
      return
    }
    router.push('/notifications')
  }

  // 읽지 않은 개수 갱신 (포커스/가시성 + realtime)
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }

    fetchUnreadCount()

    const handleFocus = () => {
      fetchUnreadCount()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Supabase Realtime: 알림 변화 감지 시 재확인
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`notifications-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
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
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full" aria-hidden />
      )}
    </button>
  )
}

