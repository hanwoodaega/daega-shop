'use client'

import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import { AuthProvider } from '@/lib/auth/auth-context'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')
  
  const content = isAdminPage ? (
    <AuthProvider>
      {children}
    </AuthProvider>
  ) : (
    <AuthProvider>
      <div className="w-full flex justify-center bg-gray-50 lg:bg-white">
        <div className="w-full max-w-[480px] lg:max-w-[1000px] bg-white shadow-lg lg:shadow-none">
          {children}
        </div>
      </div>
    </AuthProvider>
  )

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
      }}
    >
      {content}
    </SWRConfig>
  )
}

