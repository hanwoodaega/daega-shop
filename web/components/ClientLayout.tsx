'use client'

import { AuthProvider } from '@/lib/auth-context'
import DeliveryCompleteNotification from '@/components/DeliveryCompleteNotification'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
      <DeliveryCompleteNotification />
    </AuthProvider>
  )
}

