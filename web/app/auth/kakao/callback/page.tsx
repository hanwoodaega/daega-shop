'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/supabase'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

function KakaoCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('카카오 로그인 처리 중...')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState<string | null>(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true
    handleKakaoCallback()
  }, [])

  const mapErrorMessage = (code?: string | null) => {
    switch (code) {
      case 'missing_code':
        return '로그인 정보가 누락되었습니다.'
      case 'state_mismatch':
        return '요청이 만료되었거나 유효하지 않습니다.'
      case 'token_exchange_failed':
        return '카카오 인증 토큰을 가져오지 못했습니다.'
      case 'kakao_userinfo_failed':
        return '카카오 사용자 정보를 가져오지 못했습니다.'
      case 'supabase_user_failed':
        return '사용자 정보 처리에 실패했습니다.'
      case 'magiclink_failed':
        return '로그인 링크 생성에 실패했습니다.'
      case 'verify_failed':
        return '세션 생성에 실패했습니다.'
      case 'account_deleted':
        return '탈퇴한 계정은 로그인할 수 없습니다.'
      default:
        return '카카오 로그인에 실패했습니다.'
    }
  }

  const handleKakaoCallback = async () => {
    try {
      const tokenHash = searchParams.get('token_hash')
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const type = searchParams.get('type') || 'magiclink'
      const nextPath = searchParams.get('next') || '/'
      const error = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      const linked = searchParams.get('linked') === '1'

      if (error) {
        setErrorCode(error)
        if (errorDesc) {
          setErrorDescription(errorDesc)
        }
        setStatus('error')
        setMessage(mapErrorMessage(error))
        return
      }

      const { data: existingSession } = await supabase.auth.getSession()
      if (existingSession?.session) {
        router.replace(nextPath)
        return
      }

      if (!tokenHash && code && state) {
        const apiUrl = new URL('/api/auth/kakao', window.location.origin)
        apiUrl.searchParams.set('code', code)
        apiUrl.searchParams.set('state', state)
        window.location.href = apiUrl.toString()
        return
      }

      if (!tokenHash) {
        router.replace('/auth/login')
        return
      }

      if (linked) {
        setMessage('이미 가입된 계정이 있어 연결 중입니다...')
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })

      if (verifyError) {
        setErrorCode('verify_failed')
        setStatus('error')
        setMessage(mapErrorMessage('verify_failed'))
        return
      }

      document.cookie = 'kakao_oauth_state=; Max-Age=0; Path=/; SameSite=Lax'
      document.cookie = 'kakao_oauth_next=; Max-Age=0; Path=/; SameSite=Lax'

      setStatus('loading')
      setMessage('로그인 중...')

      setTimeout(() => {
        router.push(nextPath)
        router.refresh()
      }, 1500)
    } catch (error: any) {
      const fallbackCode = 'verify_failed'
      setErrorCode(fallbackCode)
      setStatus('error')
      setMessage(mapErrorMessage(fallbackCode))
    }
  }

  if (status === 'loading') {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {status === 'error' && (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold mb-4 text-red-600">로그인 실패</h2>
                <p className="text-gray-600 mb-2">{message}</p>
                {errorDescription && (
                  <p className="text-xs text-gray-400 mb-2">{errorDescription}</p>
                )}
                {errorCode && (
                  <p className="text-xs text-gray-400 mb-4">오류 코드: {errorCode}</p>
                )}
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

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FEE500] mx-auto mb-4"></div>
              <p className="text-gray-700">로딩 중...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <KakaoCallbackContent />
    </Suspense>
  )
}
