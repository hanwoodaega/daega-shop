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
      <div className="w-full flex justify-center bg-gray-50">
        <div className="w-full max-w-[480px] bg-white shadow-lg">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}

