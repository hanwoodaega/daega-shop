'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'

const sidebarMenus = [
  { href: '/profile', label: '주문 내역', icon: 'document' },
  { href: '/profile/coupons', label: '쿠폰', icon: 'coupon' },
  { href: '/profile/points', label: '포인트', icon: 'points' },
  { href: '/profile/addresses', label: '배송지 관리', icon: 'address' },
  { href: '/profile/reviews', label: '나의 리뷰', icon: 'review' },
]

const sidebarSecondary = [
  { href: '/profile/notices', label: '공지사항' },
  { href: '/profile/faq', label: '자주 묻는 질문' },
  { href: '/profile/support', label: '고객센터' },
]

function SidebarIcon({ type }: { type: string }) {
  const c = 'w-5 h-5 text-gray-600'
  switch (type) {
    case 'document':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'coupon':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    case 'points':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'address':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'review':
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    default:
      return null
  }
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)

  // 비회원은 profile/* 페이지 접근 막기
  useEffect(() => {
    if (loading) return
    if (!user) {
      const next = pathname || '/profile'
      router.replace(`/auth/login?next=${encodeURIComponent(next)}`)
    }
  }, [loading, user, pathname, router])

  useEffect(() => {
    if (!user) {
      setDisplayName(null)
      return
    }
    const nameFromMeta = user.user_metadata?.name
    if (nameFromMeta) {
      setDisplayName(nameFromMeta)
      return
    }
    fetch('/api/profile/info')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.name) setDisplayName(data.name)
        else setDisplayName(user.user_metadata?.name || '회원')
      })
      .catch(() => setDisplayName(user.user_metadata?.name || '회원'))
  }, [user])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="lg:hidden">
        {/* 모바일: 헤더는 각 페이지에서 처리 */}
      </div>
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:max-w-6xl lg:mx-auto lg:w-full lg:px-4 lg:pb-8">
        {/* PC 전용: 왼쪽 사이드바 */}
        <aside className="hidden lg:block w-72 shrink-0 pt-6 pr-6">
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            {user && (
              <div className="mb-5 pb-4 border-b border-gray-200">
                <p className="text-base font-medium text-gray-900">
                  안녕하세요, {displayName || user.user_metadata?.name || '회원'}님
                </p>
              </div>
            )}
            <div className="mb-2">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">자주 찾는 메뉴</h2>
            </div>
            <nav className="space-y-0.5">
              {sidebarMenus.map((item) => {
                const isActive = pathname === item.href || (item.href === '/profile' && pathname === '/profile')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <SidebarIcon type={item.icon} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">고객센터</h2>
              <nav className="space-y-0.5">
                {sidebarSecondary.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-base text-gray-700 hover:bg-gray-100 transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠: 모바일은 전체, PC는 오른쪽 영역 */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <Footer />
      <BottomNavbar />
    </div>
  )
}
