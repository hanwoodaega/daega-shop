'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

function NaverCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('네이버 로그인 처리 중...')

  useEffect(() => {
    handleNaverCallback()
  }, [])

  const handleNaverCallback = async () => {
    try {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const savedState = sessionStorage.getItem('naver_oauth_state')

      // CSRF 체크
      if (!code || !state || state !== savedState) {
        throw new Error('잘못된 요청입니다.')
      }

      // 액세스 토큰 요청
      const response = await fetch('/api/auth/naver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('네이버 로그인 실패')
      }

      const { user } = await response.json()

      // Supabase에 사용자 생성 또는 로그인
      // 네이버 이메일로 사용자 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (!existingUser) {
        // 새 사용자 - Supabase Auth에 등록
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: randomPassword,
          options: {
            data: {
              name: user.name,
              provider: 'naver',
              naver_id: user.id,
            },
          },
        })

        if (signUpError) throw signUpError
      }

      // 자동 로그인 (이메일 기반)
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: randomPassword,
      })

      // 비밀번호가 맞지 않으면 매직 링크로 로그인
      if (signInError) {
        await supabase.auth.signInWithOtp({
          email: user.email,
        })
      }

      sessionStorage.removeItem('naver_oauth_state')
      
      setStatus('success')
      setMessage('로그인 성공! 홈으로 이동합니다...')
      
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)
      
    } catch (error: any) {
      console.error('네이버 로그인 처리 실패:', error)
      setStatus('error')
      setMessage(error.message || '네이버 로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#03C75A] mx-auto mb-4"></div>
                <p className="text-gray-700">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-4 text-primary-900">로그인 성공!</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold mb-4 text-red-600">로그인 실패</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
                >
                  다시 시도하기
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function NaverCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-gray-50 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#03C75A] mx-auto mb-4"></div>
              <p className="text-gray-700">로딩 중...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <NaverCallbackContent />
    </Suspense>
  )
}

