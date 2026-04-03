'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'
import {
  clearPendingGuestCheckout,
  isCheckoutRedirectPath,
} from '@/lib/cart/pending-guest-checkout'

function FinalizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const [error, setError] = useState('')
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const res = await fetch(`/api/auth/finalize?next=${encodeURIComponent(nextPath)}`, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        clearPendingGuestCheckout()
        setError(data?.error || '로그인 상태를 확인할 수 없습니다.')
        return
      }
      const redirectTo = typeof data?.redirectTo === 'string' ? data.redirectTo : '/'
      if (!isCheckoutRedirectPath(redirectTo)) {
        clearPendingGuestCheckout()
      }
      router.replace(redirectTo)
    }

    run().catch((e) => setError(e?.message || '로그인 상태를 확인할 수 없습니다.'))
  }, [nextPath, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return null
}

export default function FinalizePage() {
  return (
    <Suspense fallback={null}>
      <FinalizeContent />
    </Suspense>
  )
}

