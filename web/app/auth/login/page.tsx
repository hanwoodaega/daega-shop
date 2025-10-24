'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function LoginPage() {
  const router = useRouter()
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

      router.push('/')
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
      <Navbar />
      
      <main className="flex-1 bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-3xl font-bold text-center mb-8 text-primary-900">로그인</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 소셜 로그인 */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleSocialLogin('kakao')}
                className="w-full bg-[#FEE500] text-[#000000] py-3 rounded-lg font-semibold hover:bg-[#FDD835] transition flex items-center justify-center space-x-2"
              >
                <span>카카오로 시작하기</span>
              </button>
              
              <button
                onClick={() => handleSocialLogin('naver')}
                className="w-full bg-[#03C75A] text-white py-3 rounded-lg font-semibold hover:bg-[#02B350] transition flex items-center justify-center space-x-2"
              >
                <span>네이버로 시작하기</span>
              </button>
              
              <button
                onClick={() => handleSocialLogin('google')}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center space-x-2"
              >
                <span>Google로 시작하기</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>

            {/* 이메일 로그인 */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-700"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-700"
                  placeholder="비밀번호"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition disabled:bg-gray-400"
              >
                {loading ? '로그인 중...' : '이메일로 로그인'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                계정이 없으신가요?{' '}
                <Link href="/auth/signup" className="text-primary-700 font-semibold hover:text-primary-900">
                  회원가입
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

