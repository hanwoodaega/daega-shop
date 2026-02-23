'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '@/components/layout/Footer'

const RESEND_COOLDOWN_SECONDS = 60

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [checkedUsername, setCheckedUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
  const [otpRemaining, setOtpRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameMessage, setUsernameMessage] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    const trimmed = username.trim()
    if (!trimmed) {
      setUsernameStatus('idle')
      setCheckedUsername('')
      setUsernameMessage('')
      return
    }
    if (trimmed.length < 6) {
      setUsernameStatus('invalid')
      setCheckedUsername('')
      setUsernameMessage('아이디는 최소 6자 이상이어야 합니다.')
      return
    }
    setUsernameStatus('checking')
    setUsernameMessage('')
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmed }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || '아이디 조회에 실패했습니다.')
        }
        if (data?.available) {
          setUsernameStatus('available')
          setCheckedUsername(trimmed)
          setUsernameMessage('사용 가능한 아이디입니다.')
        } else {
          setUsernameStatus('taken')
          setCheckedUsername('')
          setUsernameMessage('이미 사용 중인 아이디입니다.')
        }
      } catch (err: any) {
        setUsernameStatus('invalid')
        setUsernameMessage(err.message || '아이디 조회에 실패했습니다.')
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [username])

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

  const handleSendCode = async () => {
    setError('')
    setLoading(true)

    try {
      if (username.trim().length < 6) {
        throw new Error('아이디는 최소 6자 이상이어야 합니다.')
      }
      if (usernameStatus !== 'available' || username.trim() !== checkedUsername) {
        throw new Error('아이디 중복 확인을 해주세요.')
      }
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

      const termsData = sessionStorage.getItem('signup_terms')
      const terms = termsData ? JSON.parse(termsData) : null

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim() || null,
          phone,
          verificationToken: verifyData.verificationToken,
          terms,
        }),
      })

      const signupData = await signupRes.json().catch(() => ({}))
      if (!signupRes.ok) {
        throw new Error(signupData?.error || '회원가입에 실패했습니다.')
      }

      if (termsData) {
        sessionStorage.removeItem('signup_terms')
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
                {usernameMessage && (
                  <p
                    className={`mt-2 text-sm ${
                      usernameStatus === 'available' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {usernameMessage}
                  </p>
                )}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="이름 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                    required
                    autoComplete="tel"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                    placeholder="01012345678"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading || username.trim().length < 6}
                    className="px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    인증 요청
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  type="text"
                  value={name}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={phone}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading}
                    className="px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    인증 요청
                  </button>
                </div>
              </div>
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
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full px-1 py-2 border-b border-gray-300 focus:outline-none focus:border-red-600"
                  placeholder="6자리 숫자"
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyAndSignup}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
              >
                인증 완료 후 가입
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

