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
  const [maskedId, setMaskedId] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

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

      const firstUser = findData?.users?.[0]
      setMaskedId(firstUser?.username || '')
      setStep(3)
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
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

      <main className="flex-1 bg-white flex items-start justify-center pt-10 pb-12 px-6">
        <div className="max-w-md w-full space-y-6">
          <h2 className="text-2xl font-bold text-center text-primary-900">아이디 찾기</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="휴대폰 번호"
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={loading || cooldown > 0}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold"
              >
                {cooldown > 0 ? `재전송까지 ${cooldown}초` : '인증번호 받기'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="인증번호 6자리"
                maxLength={6}
              />
              <button
                type="button"
                onClick={verifyAndFind}
                disabled={loading}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold"
              >
                확인
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={loading || cooldown > 0}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
              >
                {cooldown > 0 ? `재전송까지 ${cooldown}초` : '인증번호 재전송'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-gray-700">아이디: <span className="font-semibold">{maskedId}</span></p>
              <Link href="/auth/login" className="block w-full bg-blue-900 text-white py-3 rounded-lg font-semibold">
                로그인하기
              </Link>
              <Link href="/auth/find-password" className="text-sm text-gray-600 underline">
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

