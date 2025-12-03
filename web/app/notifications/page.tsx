'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'earned'>('general')

  // 알림 목록 조회
  const fetchNotifications = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error('알림 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 페이지를 나갈 때 모든 알림을 읽음 처리
  useEffect(() => {
    const markAllAsRead = () => {
      if (user?.id && notifications.length > 0) {
        const unreadIds = notifications
          .filter(n => !n.is_read)
          .map(n => n.id)
        
        if (unreadIds.length > 0) {
          // 동기적으로 처리하기 위해 fetch 사용
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mark_all_read: true }),
            keepalive: true // 페이지를 나가도 요청이 완료되도록
          }).catch(() => {
            // 실패해도 무시 (페이지를 나가는 중이므로)
          })
        }
      }
    }

    // beforeunload 이벤트 (브라우저를 닫거나 다른 페이지로 이동할 때)
    window.addEventListener('beforeunload', markAllAsRead)

    // cleanup 함수 (컴포넌트 언마운트 시)
    return () => {
      window.removeEventListener('beforeunload', markAllAsRead)
      markAllAsRead()
    }
  }, [user?.id, notifications])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login?next=/notifications')
        return
      }
      fetchNotifications()
    }
  }, [user, authLoading])

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">알림</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">알림</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        {/* 탭 메뉴 */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-2 font-medium text-sm relative text-center ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            일반
            {(() => {
              const unreadCount = notifications.filter(
                n => !n.is_read && n.type !== 'point' && n.type !== 'review'
              ).length
              return unreadCount > 0 ? (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                  {unreadCount}
                </span>
              ) : null
            })()}
          </button>
          <button
            onClick={() => setActiveTab('earned')}
            className={`flex-1 px-4 py-2 font-medium text-sm relative text-center ${
              activeTab === 'earned'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            적립
            {(() => {
              const unreadCount = notifications.filter(
                n => !n.is_read && (n.type === 'point' || n.type === 'review')
              ).length
              return unreadCount > 0 ? (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                  {unreadCount}
                </span>
              ) : null
            })()}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
          </div>
        ) : (() => {
          // 탭에 따라 알림 필터링
          const filteredNotifications = notifications.filter((notification) => {
            if (activeTab === 'general') {
              // point, review가 아닌 것들만
              return notification.type !== 'point' && notification.type !== 'review'
            }
            if (activeTab === 'earned') {
              // point, review만
              return notification.type === 'point' || notification.type === 'review'
            }
            return true
          })

          return filteredNotifications.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-xl text-gray-600 mb-6">알림이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {notification.title}
                      </h3>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                        {notification.type === 'general' && notification.content.includes('구매확정하기') ? (
                          <>
                            {notification.content.split('구매확정하기').map((part, index, array) => {
                              if (index === array.length - 1) {
                                return <span key={index}>{part}</span>
                              }
                              return (
                                <span key={index}>
                                  {part}
                                  <button
                                    onClick={() => router.push('/orders')}
                                    className="text-blue-600 hover:text-red-600 underline font-medium"
                                  >
                                    구매확정하기
                                  </button>
                                </span>
                              )
                            })}
                          </>
                        ) : notification.type === 'general' && notification.content.includes('리뷰 작성하기') ? (
                          <>
                            {notification.content.split('리뷰 작성하기').map((part, index, array) => {
                              if (index === array.length - 1) {
                                return <span key={index}>{part}</span>
                              }
                              return (
                                <span key={index}>
                                  {part}
                                  <button
                                    onClick={() => router.push('/profile/reviews')}
                                    className="text-blue-600 hover:text-red-600 underline font-medium"
                                  >
                                    리뷰 작성하기
                                  </button>
                                </span>
                              )
                            })}
                          </>
                        ) : (
                          notification.content
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

