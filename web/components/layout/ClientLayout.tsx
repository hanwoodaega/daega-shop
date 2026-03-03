'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/auth/auth-context'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  
  if (isAdminPage) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    )
  }
  
  return (
    <AuthProvider>
      <div className="w-full flex justify-center bg-gray-50 lg:bg-white">
        {/* 모바일/태블릿: 480px+그림자, PC(lg): 960px, 그림자 없음(구분선 제거) */}
        <div className="w-full max-w-[480px] lg:max-w-[960px] bg-white shadow-lg lg:shadow-none">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}

