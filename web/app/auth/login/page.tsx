'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNavbar from '@/components/BottomNavbar'
import { useCartStore } from '@/lib/store'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push(nextPath)
      router.refresh()
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'kakao' | 'google' | 'naver') => {
    try {
      if (provider === 'naver') {
        // 네이버는 커스텀 OAuth 처리
        handleNaverLogin()
        return
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || '소셜 로그인에 실패했습니다.')
    }
  }
  
  const handleNaverLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    
    if (!clientId) {
      setError('네이버 로그인이 설정되지 않았습니다.')
      return
    }
    
    const redirectUri = `${window.location.origin}/auth/naver/callback`
    const state = Math.random().toString(36).substring(7)
    
    sessionStorage.setItem('naver_oauth_state', state)
    
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    
    window.location.href = naverLoginUrl
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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
          
          {/* 오른쪽: 장바구니 버튼 */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                  cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                }`}
                suppressHydrationWarning
                aria-hidden={cartCount <= 0}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 bg-white flex items-start justify-center pt-12 pb-12 px-6">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary-900">로그인</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 이메일 로그인 */}
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  placeholder="아이디 (이메일)"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  placeholder="비밀번호"
                />
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-none font-semibold hover:bg-blue-950 transition disabled:bg-gray-400"
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
                onClick={() => handleSocialLogin('kakao')}
                className="w-full bg-[#FEE500] text-[#000000] py-3 rounded-none font-semibold hover:bg-[#FDD835] transition flex items-center justify-center space-x-2"
              >
                <img 
                  src="/images/kakao-logo.png" 
                  alt="카카오" 
                  className="w-6 h-6 flex-shrink-0 object-contain"
                />
                <span>카카오로 회원가입/로그인</span>
              </button>
              
              <button
                onClick={() => handleSocialLogin('naver')}
                className="w-full bg-[#03C75A] text-white py-3 rounded-none font-semibold hover:bg-[#02B350] transition flex items-center justify-center space-x-2"
              >
                <span className="text-white font-bold text-lg">N</span>
                <span>네이버로 회원가입/로그인</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Link href="/auth/signup/terms" className="text-gray-600 hover:text-gray-900">
                  회원가입
                </Link>
                <span className="text-gray-400">|</span>
                <Link href="#" className="text-gray-600 hover:text-gray-900">
                  아이디 찾기
                </Link>
                <span className="text-gray-400">|</span>
                <Link href="#" className="text-gray-600 hover:text-gray-900">
                  비밀번호 찾기
                </Link>
              </div>
            </div>
        </div>
      </main>

      <BottomNavbar />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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
        <BottomNavbar />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

