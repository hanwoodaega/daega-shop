'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'
import Header from '@/components/Header'
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

      // Supabase Auth에 사용자 등록 또는 로그인
      // 고정 비밀번호 사용 (네이버 ID 기반)
      const password = `naver_${user.id}_${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8)}`
      
      // 전화번호 처리 (하이픈 제거)
      const phoneNumber = user.mobile ? user.mobile.replace(/[^0-9]/g, '') : null
      
      // 생일 처리 (birthday와 birthyear 조합)
      let birthday = null
      if (user.birthday && user.birthyear) {
        // birthday는 MM-DD 형식, birthyear는 YYYY 형식
        birthday = `${user.birthyear}-${user.birthday}`
      } else if (user.birthday) {
        // birthyear가 없으면 월-일만 있음 (MM-DD 형식)
        // 생일 쿠폰 지급 시 월만 추출하기 위해 임의의 연도(1900) 사용
        // 실제 연도는 중요하지 않음 (월만 비교하므로)
        birthday = `1900-${user.birthday}`
      }
      
      // 먼저 로그인 시도
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      })

      // 로그인 실패시 새 사용자 등록
      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: password,
          options: {
            data: {
              name: user.name,
              provider: 'naver',
              naver_id: user.id,
              profile_image: user.profile_image,
              phone: phoneNumber,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        })

        if (signUpError) {
          // 이미 존재하는 사용자일 수 있으므로 다시 로그인 시도
          const { error: retrySignInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password,
          })
          
          if (retrySignInError) {
            throw new Error('로그인에 실패했습니다. 고객센터에 문의해주세요.')
          }
        } else {
          // 회원가입 성공 후 users 테이블에 정보 저장 (서버 API 사용)
          const { data: authUser } = await supabase.auth.getUser()
          if (authUser?.user) {
            await fetch('/api/user/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                phone: phoneNumber || null,
                birthday: birthday,
              }),
            })
            
            // 네이버 회원가입 시 기본 약관 동의 (필수 약관만 동의, 마케팅은 미동의)
            try {
              await fetch('/api/users/terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  terms: {
                    service: true,
                    privacy: true,
                    third_party: true,
                    age14: true,
                    marketing: false,
                  },
                }),
              })
            } catch (termsError) {
              console.error('약관 동의 저장 실패:', termsError)
            }
          }
        }
      } else {
        // 기존 사용자 로그인 성공 - 정보 업데이트 (있는 경우, 서버 API 사용)
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser?.user) {
          await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              phone: phoneNumber || null,
              birthday: birthday, // 생일이 없으면 null로 저장
            }),
          })
        }
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
      <Header />
      
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
        <Header />
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

