'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'

function RestoreAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const checkStatus = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        router.replace('/auth/login')
        return
      }
      const res = await fetch('/api/auth/onboarding-status', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!isMounted) return

      if (data?.authenticated === false) {
        router.replace('/auth/login')
        return
      }

      if (!res.ok) {
        setError(data?.error || '복구 정보를 확인할 수 없습니다.')
        setChecking(false)
        return
      }

      if (data?.status !== 'deleted') {
        router.replace(nextPath)
        return
      }

      setChecking(false)
    }

    checkStatus().catch((e) => {
      if (!isMounted) return
      setError(e?.message || '복구 정보를 확인할 수 없습니다.')
      setChecking(false)
    })

    return () => {
      isMounted = false
    }
  }, [nextPath, router])

  const handleRestore = async () => {
    setError('')
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      const res = await fetch('/api/auth/restore', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || '계정 복구에 실패했습니다.')
      }
      router.push(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`)
    } catch (err: any) {
      setError(err?.message || '계정 복구에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (checking) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              계정 복구
            </h1>
          </div>

          <div className="ml-auto w-10 h-10"></div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center pt-10 pb-12 px-6">
        <div className="max-w-md w-full">
          <p className="text-sm text-gray-600 text-center mt-2 mb-10 whitespace-pre-line">
            탈퇴한 계정입니다.{'\n'}복구하려면 휴대폰 인증이 필요합니다.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-6 text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRestore}
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold bg-primary-800 text-white hover:bg-primary-900 transition disabled:opacity-50"
            >
              계정 복구하기
            </button>
            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              취소하고 로그아웃
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RestoreAccountPage() {
  return (
    <Suspense fallback={null}>
      <RestoreAccountContent />
    </Suspense>
  )
}
