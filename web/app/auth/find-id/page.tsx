'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'

const RESEND_COOLDOWN_SECONDS = 60

export default function FindIdPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const sendCode = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'find_id' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || '인증번호 발송에 실패했습니다.')
      }
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setOtpExpiresAt(Date.now() + 3 * 60 * 1000)
      setStep(2)
    } catch (err: any) {
      setError(err.message || '인증번호 발송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndFind = async () => {
    setError('')
    setLoading(true)
    try {
      const verifyRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, purpose: 'find_id' }),
      })
      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok) {
        throw new Error(verifyData?.error || '인증에 실패했습니다.')
      }

      const findRes = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          verificationToken: verifyData.verificationToken,
        }),
      })
      const findData = await findRes.json().catch(() => ({}))
      if (!findRes.ok) {
        throw new Error(findData?.error || '아이디를 찾을 수 없습니다.')
      }

      setStep(3)
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">아이디 찾기</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center pt-10 pb-12 px-6">
        <div className="max-w-md w-full">
          {step !== 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center mt-2 whitespace-pre-line">
                가입 시 등록한 휴대폰 번호로{'\n'}아이디를 확인하실 수 있습니다.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                    className="flex-1 px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                    placeholder="휴대폰 번호"
                    maxLength={13}
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={loading || phone.length < 10}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    인증 요청
                  </button>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm whitespace-pre-line">
                    {error}
                  </div>
                )}
              </div>

              {step === 2 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">인증번호</label>
                      {otpRemaining > 0 && (
                        <span className="text-sm font-semibold text-red-600">
                          {formatOtpCountdown(otpRemaining)}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      className="w-full px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                      placeholder="6자리 숫자"
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={verifyAndFind}
                    disabled={loading || code.length !== 6}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="space-y-1">
                <p className="text-gray-700">가입된 계정이 확인되었습니다.</p>
                <p className="text-gray-700">등록된 번호로 안내문자를 발송했습니다.</p>
              </div>
              <Link
                href="/auth/login"
                className="mt-12 block w-full bg-blue-900 text-white py-3 rounded-lg font-semibold"
              >
                로그인하기
              </Link>
              <Link href="/auth/find-password" className="mt-3 block text-sm text-gray-600 underline">
                비밀번호도 잊었나요?
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

