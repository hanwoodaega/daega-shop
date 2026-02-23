'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      const res = await fetch('/api/auth/onboarding-status', {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!isMounted) return
      if (!res.ok) {
        setError(data?.error || '온보딩 정보를 확인할 수 없습니다.')
        return
      }

      if (data?.status === 'deleted') {
        router.replace(`/auth/restore?next=${encodeURIComponent(nextPath)}`)
        return
      }

      const requiresPhoneVerification = Boolean(data?.requiresPhoneVerification)

      if (requiresPhoneVerification) {
        router.replace(`/auth/verify-phone?next=${encodeURIComponent(nextPath)}`)
        return
      }

      router.replace(nextPath)
    }

    run().catch((e) => {
      setError(e?.message || '온보딩 정보를 확인할 수 없습니다.')
    })

    return () => {
      isMounted = false
    }
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  )
}
