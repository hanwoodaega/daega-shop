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
      router.replace(`/auth/finalize?next=${encodeURIComponent(nextPath)}`)
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
