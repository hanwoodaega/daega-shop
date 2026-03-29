'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase/supabase'
import { sanitizeOtpCodeInput } from '@/lib/phone/kr'
import { formatPhoneDisplay, parsePhoneInput, extractPhoneNumbers } from '@/lib/utils/format-phone'

const RESEND_COOLDOWN_SECONDS = 60

function checkboxStyle(checked: boolean) {
  return {
    backgroundImage: checked
      ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
      : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%239ca3af\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
    backgroundSize: '80%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }
}

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
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [otpVerified, setOtpVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
  const [otpRemaining, setOtpRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameMessage, setUsernameMessage] = useState('')

  const [allAgreed, setAllAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [thirdPartyAgreed, setThirdPartyAgreed] = useState(false)
  const [ageAgreed, setAgeAgreed] = useState(false)
  const [marketingAgreed, setMarketingAgreed] = useState(false)

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

  useEffect(() => {
    if (termsAgreed && privacyAgreed && thirdPartyAgreed && ageAgreed && marketingAgreed) {
      setAllAgreed(true)
    } else {
      setAllAgreed(false)
    }
  }, [termsAgreed, privacyAgreed, thirdPartyAgreed, ageAgreed, marketingAgreed])

  const handleAllAgree = (checked: boolean) => {
    setAllAgreed(checked)
    setTermsAgreed(checked)
    setPrivacyAgreed(checked)
    setThirdPartyAgreed(checked)
    setAgeAgreed(checked)
    setMarketingAgreed(checked)
  }

  const formatOtpCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
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
      setOtpVerified(false)
      setVerificationToken(null)
      setStep(2)
    } catch (err: any) {
      setError(err.message || '인증번호 발송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (verificationCode.length !== 6) return
    setError('')
    setLoading(true)
    try {
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
      setVerificationToken(verifyData.verificationToken ?? null)
      setOtpVerified(true)
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndSignup = async () => {
    setError('')
    if (!otpVerified || !verificationToken) {
      setError('인증을 완료해 주세요.')
      return
    }
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다.')
      }
      if (!(termsAgreed && privacyAgreed && thirdPartyAgreed && ageAgreed)) {
        throw new Error('필수 약관에 모두 동의해 주세요.')
      }

      const terms = {
        service: termsAgreed,
        privacy: privacyAgreed,
        third_party: thirdPartyAgreed,
        age14: ageAgreed,
        marketing: marketingAgreed,
      }

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim() || null,
          phone,
          verificationToken,
          terms,
        }),
      })

      const signupData = await signupRes.json().catch(() => ({}))
      if (!signupRes.ok) {
        throw new Error(signupData?.error || '회원가입에 실패했습니다.')
      }

      await supabase.auth.signOut()
      router.push('/auth/login?signup=1&next=/')
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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
        <div className="max-w-md w-full lg:max-w-xl lg:mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">회원가입</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">아이디</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 placeholder:text-gray-400"
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
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">비밀번호</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 placeholder:text-gray-400"
                    placeholder="비밀번호 입력"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">비밀번호 확인</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 placeholder:text-gray-400"
                    placeholder="비밀번호 확인"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">이름</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 placeholder:text-gray-400"
                    placeholder="이름 입력"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28 pt-0.5">휴대폰 번호</label>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="tel"
                    value={formatPhoneDisplay(phone)}
                    onChange={(e) => setPhone(parsePhoneInput(e.target.value))}
                    required
                    autoComplete="tel"
                    className="flex-1 min-w-0 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 placeholder:text-gray-400"
                    placeholder="휴대폰 번호를 입력해주세요"
                    maxLength={13}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading || username.trim().length < 6 || extractPhoneNumbers(phone).length < 10}
                    className={`w-full sm:w-auto flex-shrink-0 px-3 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 whitespace-nowrap border ${
                      loading || username.trim().length < 6 || extractPhoneNumbers(phone).length < 10
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'border-blue-900 bg-blue-900 text-white hover:bg-blue-950'
                    }`}
                  >
                    인증 요청
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">아이디</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={username}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">비밀번호</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="password"
                    value={password}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28">이름</label>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={name}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <label className="text-sm font-medium text-gray-700 shrink-0 lg:w-28 pt-0.5">휴대폰 번호</label>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="tel"
                    value={formatPhoneDisplay(phone)}
                    readOnly
                    className="flex-1 min-w-0 w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading}
                    className={`w-full sm:w-auto flex-shrink-0 px-3 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 whitespace-nowrap border ${
                      loading
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'border-blue-900 bg-blue-900 text-white hover:bg-blue-950'
                    }`}
                  >
                    인증 요청
                  </button>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <div className="flex items-center justify-between shrink-0 lg:w-36">
                  <label className="text-sm font-medium text-gray-700">인증번호</label>
                  {otpRemaining > 0 && !otpVerified && (
                    <span className="text-sm font-semibold text-red-600">
                      {formatOtpCountdown(otpRemaining)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {otpVerified ? (
                    <p className="text-gray-700 font-medium">인증완료</p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(sanitizeOtpCodeInput(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 placeholder:text-gray-400"
                        placeholder="6자리 숫자"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading || verificationCode.length !== 6}
                        className="mt-2 w-full sm:w-auto px-3 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 whitespace-nowrap border border-blue-900 bg-blue-900 text-white hover:bg-blue-950 disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500"
                      >
                        {loading ? '인증 중...' : '인증 완료'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 약관 동의 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-4">
              <div className="shrink-0 lg:w-28 lg:pt-0.5">
                <h3 className="text-sm font-medium text-gray-700">이용약관동의</h3>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="py-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allAgreed}
                      onChange={(e) => handleAllAgree(e.target.checked)}
                      className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                      style={checkboxStyle(allAgreed)}
                    />
                    <span className="ml-2 text-base text-gray-900 font-bold">전체 동의하기</span>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">이용약관, 개인정보 처리, 제3자 제공, 만 14세 이상 확인 및 마케팅 정보 수신(선택)을 포함합니다.</p>
                </div>

                <div className="py-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => {
                          setTermsAgreed(e.target.checked)
                          if (!e.target.checked) setAllAgreed(false)
                        }}
                        className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                        style={checkboxStyle(termsAgreed)}
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900">
                        <span className="text-blue-900">필수</span>
                        <span className="ml-1">이용약관 동의</span>
                      </span>
                    </div>
                    <Link href="/terms" target="_blank" className="text-xs text-blue-900 hover:text-blue-700 flex items-center shrink-0">
                      약관보기
                      <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">서비스 이용에 필요한 기본 약관입니다.</p>
                </div>

                <div className="py-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => {
                          setPrivacyAgreed(e.target.checked)
                          if (!e.target.checked) setAllAgreed(false)
                        }}
                        className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                        style={checkboxStyle(privacyAgreed)}
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900">
                        <span className="text-blue-900">필수</span>
                        <span className="ml-1">개인정보 수집 및 이용 동의</span>
                      </span>
                    </div>
                    <Link href="/privacy" target="_blank" className="text-xs text-blue-900 hover:text-blue-700 flex items-center shrink-0">
                      약관보기
                      <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">회원가입, 주문/배송, 고객 상담을 위해 개인정보를 수집·이용합니다.</p>
                </div>

                <div className="py-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={thirdPartyAgreed}
                        onChange={(e) => {
                          setThirdPartyAgreed(e.target.checked)
                          if (!e.target.checked) setAllAgreed(false)
                        }}
                        className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                        style={checkboxStyle(thirdPartyAgreed)}
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900">
                        <span className="text-blue-900">필수</span>
                        <span className="ml-1">개인정보 제3자 제공 동의</span>
                      </span>
                    </div>
                    <Link href="/privacy" target="_blank" className="text-xs text-blue-900 hover:text-blue-700 flex items-center shrink-0">
                      약관보기
                      <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">배송업체 및 결제대행사에 서비스 제공을 위한 정보가 제공됩니다.</p>
                </div>

                <div className="py-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingAgreed}
                      onChange={(e) => {
                        setMarketingAgreed(e.target.checked)
                        if (!e.target.checked) setAllAgreed(false)
                      }}
                      className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                      style={checkboxStyle(marketingAgreed)}
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      <span className="text-gray-500">선택</span>
                      <span className="ml-1">마케팅 정보 수신 동의</span>
                    </span>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">할인 혜택 및 이벤트 소식을 받아볼 수 있습니다.</p>
                </div>

                <div className="py-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageAgreed}
                      onChange={(e) => {
                        setAgeAgreed(e.target.checked)
                        if (!e.target.checked) setAllAgreed(false)
                      }}
                      className="w-6 h-6 appearance-none bg-white border border-gray-400 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                      style={checkboxStyle(ageAgreed)}
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      <span className="text-blue-900">필수</span>
                      <span className="ml-1">본인은 만 14세 이상입니다</span>
                    </span>
                  </label>
                  <p className="ml-8 mt-0.5 text-xs text-gray-500">개인정보보호법에 따라 만 14세 미만은 가입이 제한됩니다.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleVerifyAndSignup}
              disabled={step === 1 || loading}
              className="w-full lg:max-w-sm bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed"
            >
              {loading ? '가입 처리 중...' : '가입하기'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

