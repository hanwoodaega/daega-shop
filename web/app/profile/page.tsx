'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/profile')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.id) {
      loadUserProfile()
    }
  }, [user?.id]) // ✅ user.id만 의존성으로 (무한 루프 방지)

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user!.id)
        .single()

      if (error) throw error

      setUserName(data?.name || user!.user_metadata?.name || user!.email?.split('@')[0] || '사용자')
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      setUserName(user!.user_metadata?.name || user!.email?.split('@')[0] || '사용자')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-24">
        {/* 사용자 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-primary-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userName}님
              </h1>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>

        {/* 메뉴 섹션 */}
        <div className="bg-white rounded-lg shadow-md divide-y">
          {/* 주문내역 */}
          <Link
            href="/orders"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-base font-medium text-gray-900">주문내역</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 회원정보 수정 */}
          <Link
            href="/profile/edit"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-base font-medium text-gray-900">회원정보 수정</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 배송지 관리 */}
          <Link
            href="/profile/addresses"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-base font-medium text-gray-900">배송지 관리</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 내 쿠폰함 */}
          <Link
            href="/profile/coupons"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span className="text-base font-medium text-gray-900">내 쿠폰함</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 리뷰 관리 */}
          <Link
            href="/profile/reviews"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-base font-medium text-gray-900">리뷰 관리</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 고객센터 */}
          <Link
            href="/support"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base font-medium text-gray-900">고객센터</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 로그아웃 버튼 */}
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            로그아웃
          </button>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

