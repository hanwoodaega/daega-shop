'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useUnreadCount } from '@/lib/swr'

export default function NotificationBell() {
  const router = useRouter()
  const { user } = useAuth()
  const { unreadCount } = useUnreadCount()

  // 알림 페이지로 이동
  const handleClick = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    router.push('/notifications')
  }

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
        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" aria-hidden />
      )}
    </button>
  )
}

