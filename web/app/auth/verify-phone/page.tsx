'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'

const RESEND_COOLDOWN_SECONDS = 60

function VerifyPhoneContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [requireName, setRequireName] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
  const [otpRemaining, setOtpRemaining] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!otpExpiresAt) return
    const updateRemaining = () => {
      const remainingMs = otpExpiresAt - Date.now()
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
      setOtpRemaining(remainingSec)
      if (remainingSec <= 0) {
        setOtpExpiresAt(null)
      }
    }
    updateRemaining()
    const timer = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(timer)
  }, [otpExpiresAt])

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionName = sessionData?.session?.user?.user_metadata?.name?.trim() || ''
      try {
        const res = await fetch('/api/user/profile')
        if (!res.ok) {
          if (!isMounted) return
          setName(sessionName)
          setRequireName(!sessionName)
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!isMounted) return
        const profileName = (data?.profile?.name || '').trim()
        const displayName = profileName || sessionName
        setName(displayName)
        setRequireName(!displayName)
      } catch {
        if (!isMounted) return
        setName(sessionName)
        setRequireName(!sessionName)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const formatOtpCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const normalizePhoneInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const handleSendCode = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/[^0-9]/g, ''),
          purpose: 'verify_phone',
          allowMerge: true,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || '인증번호 발송에 실패했습니다.')
      }

      setCooldown(RESEND_COOLDOWN_SECONDS)
      setMessage('인증번호가 발송되었습니다.')
      setOtpExpiresAt(Date.now() + 3 * 60 * 1000)
    } catch (err: any) {
      setError(err.message || '인증번호 발송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (requireName && !name.trim()) {
        throw new Error('이름을 입력해주세요.')
      }
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/[^0-9]/g, ''),
          code: verificationCode,
          name: name.trim(),
          allowMerge: true,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || '인증에 실패했습니다.')
      }

      if (data?.merged && data?.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: data.type || 'magiclink',
        })
        if (verifyError) {
          throw new Error('계정 연결에 실패했습니다.')
        }
      }

      router.replace(nextPath)
      router.refresh()
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.')
    } finally {
      setLoading(false)
    }
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
              휴대폰 인증
            </h1>
          </div>

          <div className="ml-auto w-10 h-10"></div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center pt-10 pb-12 px-6">
        <div className="max-w-md w-full">
          <p className="text-sm text-gray-600 text-center mt-2 mb-10 whitespace-pre-line">
            서비스의 안전한 사용을 위해{'\n'}휴대폰 인증을 해주세요.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          <div className="space-y-4">
            {requireName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                  placeholder="이름 입력"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                휴대폰 번호
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                  className="flex-1 px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                  placeholder="01012345678"
                  maxLength={13}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || cooldown > 0 || phone.length < 10}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap"
                >
                  인증 요청
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  인증번호
                </label>
                {otpRemaining > 0 && (
                  <span className="text-sm font-semibold text-red-600">
                    {formatOtpCountdown(otpRemaining)}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                placeholder="6자리 숫자"
                maxLength={6}
                required
              />
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
            >
              인증 완료
            </button>
          </div>
        </div>
      </main>

    </div>
  )
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <VerifyPhoneContent />
    </Suspense>
  )
}
