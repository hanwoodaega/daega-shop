'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'

const RESEND_COOLDOWN_SECONDS = 60

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingPhone, setExistingPhone] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const handleSendCode = async () => {
    setError('')
    setExistingPhone(false)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          purpose: 'signup',
          username: username.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'PHONE_EXISTS') {
          setExistingPhone(true)
        }
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

  const handleVerifyAndSignup = async () => {
    setError('')
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다.')
      }

      const verifyRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: verificationCode,
          purpose: 'signup',
        }),
      })

      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok) {
        throw new Error(verifyData?.error || '인증에 실패했습니다.')
      }

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim() || null,
          phone,
          verificationToken: verifyData.verificationToken,
        }),
      })

      const signupData = await signupRes.json().catch(() => ({}))
      if (!signupRes.ok) {
        throw new Error(signupData?.error || '회원가입에 실패했습니다.')
      }

      try {
        const termsData = sessionStorage.getItem('signup_terms')
        if (termsData) {
          const terms = JSON.parse(termsData)
          await fetch('/api/users/terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terms }),
          })
          sessionStorage.removeItem('signup_terms')
        }
      } catch (termsError) {
        console.error('약관 동의 저장 실패:', termsError)
      }

      try {
        await fetch('/api/users/signup-coupon', { method: 'POST' })
      } catch (couponError) {
        console.error('첫구매 쿠폰 지급 실패:', couponError)
      }

      router.push('/auth/login?next=/')
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">회원가입</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-white flex items-start justify-center pt-8 pb-32 px-6 overflow-y-auto scrollbar-hide">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary-900">회원가입</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {existingPhone && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg text-sm text-gray-700 space-y-3">
              <p className="font-medium">이미 가입된 휴대폰 번호입니다.</p>
              <div className="flex gap-2">
                <Link href="/auth/login" className="flex-1 text-center py-2 border rounded-lg">
                  로그인
                </Link>
                <Link href="/auth/find-id" className="flex-1 text-center py-2 border rounded-lg">
                  아이디 찾기
                </Link>
                <Link href="/auth/find-password" className="flex-1 text-center py-2 border rounded-lg">
                  비밀번호 재설정
                </Link>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="아이디 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="비밀번호 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="비밀번호 확인"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름 (선택)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="이름 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="휴대폰 번호 입력"
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || cooldown > 0}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
              >
                {cooldown > 0 ? `재전송까지 ${cooldown}초` : '인증번호 받기'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">인증번호 입력</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="6자리 숫자"
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyAndSignup}
                disabled={loading}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
              >
                인증 완료 후 가입
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || cooldown > 0}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                {cooldown > 0 ? `재전송까지 ${cooldown}초` : '인증번호 재전송'}
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

