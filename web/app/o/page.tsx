'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'

/**
 * /o 진입 시 회원이면 /orders, 비회원이면 /order-lookup으로 리다이렉트
 */
export default function OrderShortcutPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace('/orders')
    } else {
      router.replace('/order-lookup')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900" />
    </div>
  )
}
