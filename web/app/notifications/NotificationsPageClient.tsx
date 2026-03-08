'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useNotifications } from '@/lib/notification'
import NotificationsHeader from './_components/NotificationsHeader'
import NotificationsTabs from './_components/NotificationsTabs'
import NotificationsList from './_components/NotificationsList'
import NotificationsSkeleton from './_components/NotificationsSkeleton'

function NotificationsPageContent() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const {
    notifications,
    loading,
    activeTab,
    setActiveTab,
    filteredNotifications,
    unreadCountGeneral,
    unreadCountEarned,
    markAllRead,
  } = useNotifications({ userId: user?.id })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/notifications')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    return () => {
      markAllRead()
    }
  }, [markAllRead])

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="lg:hidden">
          <NotificationsHeader />
        </div>
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일: 기존 알림 헤더 */}
      <div className="lg:hidden">
        <NotificationsHeader />
      </div>
      {/* PC: 메인 헤더 + 메인메뉴 */}
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>

      <main className="flex-1 container mx-auto max-w-3xl px-4 py-6 pb-24 lg:pb-6">
        <h2 className="hidden lg:block text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">알림</h2>
        <NotificationsTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCountGeneral={unreadCountGeneral}
          unreadCountEarned={unreadCountEarned}
        />

        {loading ? (
          <NotificationsSkeleton />
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-xl text-gray-600 mb-6">알림이 없습니다.</p>
          </div>
        ) : (
          <NotificationsList notifications={filteredNotifications} />
        )}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function NotificationsPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-white">
        <div className="lg:hidden">
          <NotificationsHeader />
        </div>
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <NotificationsSkeleton />
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <NotificationsPageContent />
    </Suspense>
  )
}


