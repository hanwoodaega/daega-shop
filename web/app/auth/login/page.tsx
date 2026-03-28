'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/supabase'
import { mutateUnreadCount } from '@/lib/swr'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectAfterLogin = searchParams.get('next') || '/'
  const urlError = searchParams.get('error')
  const fromSignup = searchParams.get('signup') === '1'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'kakao' | 'naver' | 'google' | null>(null)
  const [error, setError] = useState(urlError || '')
  const [showSignupSuccess, setShowSignupSuccess] = useState(fromSignup)

  useEffect(() => {
    if (!fromSignup) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('signup')
    const cleanSearch = params.toString()
    const replaceUrl = cleanSearch ? `?${cleanSearch}` : window.location.pathname
    window.history.replaceState(null, '', replaceUrl)
  }, [fromSignup, searchParams])

  useEffect(() => {
    let isMounted = true
    const checkExistingSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!isMounted) return
      if (sessionData?.session?.access_token) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('post_login_next', redirectAfterLogin)
        }
        router.replace(redirectAfterLogin)
      }
    }
    checkExistingSession().catch(() => {})
    return () => {
      isMounted = false
    }
  }, [router, redirectAfterLogin])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const resolveRes = await fetch('/api/auth/resolve-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      const resolveData = await resolveRes.json().catch(() => ({}))
      if (!resolveRes.ok) {
        throw new Error(resolveData?.error || '로그인 정보를 찾을 수 없습니다.')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolveData.email,
        password,
      })

      if (error) {
        throw error
      }
      mutateUnreadCount().catch(() => {})
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('post_login_next', redirectAfterLogin)
        sessionStorage.setItem('post_login_provider', 'password')
      }
      router.replace(redirectAfterLogin)
      router.refresh()
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'kakao' | 'google' | 'naver') => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('post_login_next', redirectAfterLogin)
        sessionStorage.setItem('post_login_provider', provider)
      }
      if (provider === 'kakao') {
        setSocialLoading('kakao')
        await handleKakaoLogin()
        return
      }
      if (provider === 'naver') {
        setSocialLoading('naver')
        await handleNaverLogin()
        return
      }
      
      setSocialLoading(provider)
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectAfterLogin)}`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || '소셜 로그인에 실패했습니다.')
      setSocialLoading(null)
    }
  }
  
  const handleKakaoLogin = async () => {
    const clientId =
      process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || process.env.NEXT_PUBLIC_KAKAO_APP_KEY

    if (!clientId) {
      throw new Error('카카오 로그인이 설정되지 않았습니다.')
    }

    // 기존 세션이 남아있으면 콜백에서 갱신이 스킵됨
    const { data: existingSession } = await supabase.auth.getSession()
    if (existingSession?.session) {
      void supabase.auth.signOut()
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/kakao`
    const state = Math.random().toString(36).substring(7)

    const isSecure = window.location.protocol === 'https:'
    const stateCookieParts = [
      `kakao_oauth_state=${encodeURIComponent(state)}`,
      'Path=/',
      'Max-Age=300',
      'SameSite=Lax',
    ]
    if (isSecure) {
      stateCookieParts.push('Secure')
    }
    document.cookie = stateCookieParts.join('; ')

    const nextCookieParts = [
      `kakao_oauth_next=${encodeURIComponent(redirectAfterLogin)}`,
      'Path=/',
      'Max-Age=300',
      'SameSite=Lax',
    ]
    if (isSecure) {
      nextCookieParts.push('Secure')
    }
    document.cookie = nextCookieParts.join('; ')

    const kakaoLoginUrl =
      `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    window.location.href = kakaoLoginUrl
  }

  const handleNaverLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    
    if (!clientId) {
      throw new Error('네이버 로그인이 설정되지 않았습니다.')
    }

    // 기존 세션이 남아있으면 콜백에서 갱신이 스킵됨
    const { data: existingSession } = await supabase.auth.getSession()
    if (existingSession?.session) {
      void supabase.auth.signOut()
    }
    
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/naver`
    const state = Math.random().toString(36).substring(7)
    
    const isSecure = window.location.protocol === 'https:'
    const stateCookieParts = [
      `naver_oauth_state=${encodeURIComponent(state)}`,
      'Path=/',
      'Max-Age=300',
      'SameSite=Lax',
    ]
    if (isSecure) {
      stateCookieParts.push('Secure')
    }
    document.cookie = stateCookieParts.join('; ')

    const nextCookieParts = [
      `naver_oauth_next=${encodeURIComponent(redirectAfterLogin)}`,
      'Path=/',
      'Max-Age=300',
      'SameSite=Lax',
    ]
    if (isSecure) {
      nextCookieParts.push('Secure')
    }
    document.cookie = nextCookieParts.join('; ')
    
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    
    window.location.href = naverLoginUrl
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* PC: 메인 헤더 + 메인메뉴 */}
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>
      {/* 모바일: 간단 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              로그인
            </h1>
          </div>
          
          {/* 오른쪽: 홈 버튼 */}
          <div className="ml-auto flex items-center">
            <Link
              href="/"
              aria-label="홈으로"
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 bg-white flex items-start justify-center pt-12 pb-12 px-6">
        <div className="max-w-md w-full lg:max-w-sm lg:mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary-900">로그인</h2>

            {showSignupSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5" aria-hidden>✓</span>
                <div className="flex-1">
                  <p className="font-medium">회원가입이 완료되었습니다.</p>
                  <p className="mt-1 text-green-700">아래에서 로그인해주세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignupSuccess(false)}
                  className="flex-shrink-0 p-1 text-green-600 hover:text-green-800 rounded"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
            )}

            {(error || urlError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error || urlError}
              </div>
            )}

            {/* 이메일 로그인 */}
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  placeholder="아이디를 입력해주세요"
                  autoComplete="username"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  placeholder="비밀번호를 입력해주세요"
                />
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>

            {/* 소셜 로그인 */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('kakao')}
                disabled={!!socialLoading}
                className="w-full bg-[#FEE500] text-[#000000] py-3 rounded-lg font-semibold hover:bg-[#FDD835] transition flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {socialLoading === 'kakao' ? (
                  <span className="inline-block w-5 h-5 border-2 border-[#000000] border-t-transparent rounded-full animate-spin" aria-hidden />
                ) : (
                  <>
                    <img 
                      src="/images/kakao-logo.png" 
                      alt="카카오" 
                      className="w-6 h-6 flex-shrink-0 object-contain"
                    />
                    <span>카카오로 회원가입/로그인</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => handleSocialLogin('naver')}
                disabled={!!socialLoading}
                className="w-full bg-[#03C75A] text-white py-3 rounded-lg font-semibold hover:bg-[#02B350] transition flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {socialLoading === 'naver' ? (
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                ) : (
                  <>
                    <span className="text-white font-bold text-lg">N</span>
                    <span>네이버로 회원가입/로그인</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Link href="/auth/signup" className="text-gray-600 hover:text-gray-900">
                  회원가입
                </Link>
                <span className="text-gray-400">|</span>
                <Link href="/auth/find-id" className="text-gray-600 hover:text-gray-900">
                  아이디 찾기
                </Link>
                <span className="text-gray-400">|</span>
                <Link href="/auth/find-password" title="비밀번호 찾기" className="text-gray-600 hover:text-gray-900">
                  비밀번호 찾기
                </Link>
              </div>
            </div>
        </div>
      </main>

      <div className="hidden lg:block lg:mt-16">
        <Footer />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="w-10 h-10"></div>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">로그인</h1>
            </div>
            <div className="ml-auto w-10 h-10"></div>
          </div>
        </header>
        <main className="flex-1 bg-white flex items-start justify-center pt-12 pb-12 px-6">
          <div className="max-w-md w-full">
            <div className="animate-pulse">로딩 중...</div>
          </div>
        </main>
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

