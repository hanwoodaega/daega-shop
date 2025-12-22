'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean | null; message: string }>({ isValid: null, message: '' })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      main::-webkit-scrollbar,
      body::-webkit-scrollbar,
      html::-webkit-scrollbar {
        display: none;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailValidation({ isValid: null, message: '' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(email)) {
      setEmailValidation({ isValid: true, message: '사용 가능한 이메일입니다.' })
    } else {
      setEmailValidation({ isValid: false, message: '이메일 형식이 올바르지 않습니다.' })
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    if (!isVerified) {
      setError('전화번호 인증을 완료해주세요.')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            phone: phone,
          },
        },
      })

      if (error) {
        // 이메일 중복 체크
        if (error.message?.includes('already registered') || 
            error.message?.includes('User already registered') ||
            error.message?.includes('email address is already')) {
          setError('이미 가입된 이메일입니다.\n로그인하거나 비밀번호 찾기를 이용하세요.')
          setLoading(false)
          return
        }
        throw error
      }

      // 이메일 인증이 필요한 경우 즉시 세션이 없을 수 있어
      // 클라이언트에서 users 테이블에 쓰기가 RLS에 의해 실패할 수 있음.
      // 메타데이터로 전달했으므로 인증 완료 후 서버에서 users로 동기화됨.

      // 약관 동의 정보 저장
      try {
        const termsData = sessionStorage.getItem('signup_terms')
        if (termsData) {
          const terms = JSON.parse(termsData)
          await fetch('/api/users/terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terms }),
          })
          // 저장 후 세션 스토리지에서 제거
          sessionStorage.removeItem('signup_terms')
        }
      } catch (termsError) {
        // 약관 동의 저장 실패해도 회원가입은 성공으로 처리
        console.error('약관 동의 저장 실패:', termsError)
      }

      // 첫구매 쿠폰 지급
      try {
        await fetch('/api/users/signup-coupon', {
          method: 'POST',
        })
      } catch (couponError) {
        // 쿠폰 지급 실패해도 회원가입은 성공으로 처리
        console.error('첫구매 쿠폰 지급 실패:', couponError)
      }

      setSuccess(true)
    } catch (error: any) {
      // 이미 처리된 에러는 그대로 사용
      if (error.message?.includes('이미 가입된 이메일입니다.')) {
        setError(error.message)
      } else if (error.message?.includes('already registered') || 
                 error.message?.includes('User already registered') ||
                 error.message?.includes('email address is already')) {
        setError('이미 가입된 이메일입니다.\n로그인하거나 비밀번호 찾기를 이용하세요.')
      } else {
        setError(error.message || '회원가입에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
                회원가입
              </h1>
            </div>
            
          </div>
        </header>
        
        <main className="flex-1 bg-white flex items-center justify-center py-12 px-6">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold mb-4 text-primary-900">회원가입 완료!</h2>
            <p className="text-gray-600 mb-6">
              이메일을 확인하여 계정을 활성화해주세요.
            </p>
            <Link href="/auth/login">
              <button className="bg-blue-900 text-white px-6 py-3 rounded-none font-semibold hover:bg-blue-950 transition">
                로그인하러 가기
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              회원가입
            </h1>
          </div>
          
        </div>
      </header>
      
      <main 
        className="flex-1 bg-white flex items-start justify-center pt-8 pb-32 px-6 overflow-y-auto scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary-900">회원가입</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          <form id="signup-form" onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    validateEmail(e.target.value)
                  }}
                  onBlur={() => validateEmail(email)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="이메일 입력"
                />
                {emailValidation.message && (
                  <p className={`mt-1 text-xs ${emailValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {emailValidation.message}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>비밀번호</span>
                  <span className="text-xs font-normal text-gray-500">문자, 숫자, 특수문자 포함 8~20자</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="비밀번호 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 재확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="비밀번호 재입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="이름"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>전화번호</span>
                  <span className="text-xs font-normal text-gray-500">하이픈(-) 없이 입력</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                    placeholder="전화번호"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
                        setError('올바른 전화번호를 입력해주세요.')
                        return
                      }

                      setIsVerifying(true)
                      setError('')

                      try {
                        const response = await fetch('/api/auth/send-verification-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ phone: phone.replace(/[^0-9]/g, '') }),
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.error || '인증번호 발송에 실패했습니다.')
                        }

                        setIsCodeSent(true)
                        setError('')
                      } catch (error: any) {
                        console.error('인증번호 발송 실패:', error)
                        setError(error.message || '인증번호 발송에 실패했습니다.')
                      } finally {
                        setIsVerifying(false)
                      }
                    }}
                    disabled={!phone || isVerifying}
                    className="px-4 py-2.5 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isVerifying ? '발송 중...' : isCodeSent ? '재발송' : '인증번호'}
                  </button>
                </div>
                {isCodeSent && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                      placeholder="인증번호 입력"
                      disabled={isVerified}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!verificationCode || verificationCode.length !== 6) {
                          setError('인증번호 6자리를 입력해주세요.')
                          return
                        }

                        setIsVerifying(true)
                        setError('')

                        try {
                          const response = await fetch('/api/auth/verify-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              phone: phone.replace(/[^0-9]/g, ''),
                              code: verificationCode 
                            }),
                          })

                          const data = await response.json()

                          if (!response.ok) {
                            throw new Error(data.error || '인증번호가 일치하지 않습니다.')
                          }

                          setIsVerified(true)
                          setError('')
                        } catch (error: any) {
                          console.error('인증번호 확인 실패:', error)
                          setError(error.message || '인증번호가 일치하지 않습니다.')
                        } finally {
                          setIsVerifying(false)
                        }
                      }}
                      disabled={!verificationCode || isVerified || isVerifying}
                      className="px-4 py-2.5 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isVerified ? '인증완료' : isVerifying ? '확인 중...' : '인증'}
                    </button>
                  </div>
                )}
              </div>
          </form>

        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white border-t border-gray-200 px-6 py-4">
            <button
              type="submit"
              form="signup-form"
              disabled={loading}
              className="w-full bg-blue-900 text-white py-3 rounded-none font-semibold hover:bg-blue-950 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

