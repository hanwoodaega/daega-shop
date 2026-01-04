'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/auth/auth-context'
import { useTimeDealPolling } from '@/lib/timedeal'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  
  // 페이지별 타임딜 폴링 limit 결정
  // 전체 페이지 (타임딜, 특가)에서는 30개, 그 외(메인 포함)는 10개
  const timedealLimit = pathname === '/timedeal' || pathname === '/sale' ? 30 : 10
  
  // 타임딜 폴링 시작 (전역 단일 인스턴스, 페이지별 limit 적용)
  useTimeDealPolling(timedealLimit)
  
  if (isAdminPage) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    )
  }
  
  return (
    <AuthProvider>
      <div className="w-full flex justify-center bg-gray-50">
        <div className="w-full max-w-[480px] bg-white shadow-lg">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}

