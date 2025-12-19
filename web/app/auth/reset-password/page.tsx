'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNavbar from '@/components/BottomNavbar'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  // 비밀번호 재설정 페이지는 서버 콜백(/auth/callback)을 통해 세션이 설정된 상태로 들어옵니다.
  useEffect(() => {
    let mounted = true
    let sessionEstablished = false
    let timeoutId: NodeJS.Timeout | null = null

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (mounted && !sessionEstablished) {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          sessionEstablished = true
          if (timeoutId) clearTimeout(timeoutId)
          setSessionChecked(true)
          setError('')
        }
      }
    })

    const checkSession = async () => {
      // 1. 서버 API로 세션 확인
      try {
        const serverResponse = await fetch('/api/auth/session')
        const serverData = await serverResponse.json()
        
        if (serverData.user) {
          sessionEstablished = true
          setSessionChecked(true)
          setError('')
          return
        }
      } catch (err) {
        // 무시
      }
      
      // 2. 클라이언트 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      if (session || user) {
        sessionEstablished = true
        setSessionChecked(true)
        setError('')
        return
      }

      // 3. 세션이 없으면 잠시 대기 후 다시 확인 (서버 콜백 처리 시간 고려)
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 서버 API로 다시 확인
        try {
          const retryResponse = await fetch('/api/auth/session')
          const retryData = await retryResponse.json()
          if (retryData.user) {
            sessionEstablished = true
            setSessionChecked(true)
            setError('')
            return
          }
        } catch (err) {
          // 무시
        }
        
        // 클라이언트로도 확인
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession) {
          sessionEstablished = true
          setSessionChecked(true)
          setError('')
          return
        }
      }

      // 4. 최종 확인 후에도 세션이 없으면 에러
      if (!sessionEstablished) {
        timeoutId = setTimeout(() => {
          if (mounted && !sessionEstablished) {
            setError('인증 세션을 찾을 수 없습니다. 이메일 링크를 다시 클릭하거나, 비밀번호 찾기를 다시 시도해 주세요.')
            setSessionChecked(true)
          }
        }, 1000)
      }
    }

    checkSession()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 변경 직전 세션 최종 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('인증 세션이 만료되었습니다. 페이지를 새로고침하거나 링크를 다시 클릭해 주세요.')
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-center">
          <h1 className="text-lg font-medium">비밀번호 재설정</h1>
        </div>
      </header>

      <main className="flex-1 bg-white p-6 max-w-md mx-auto w-full mt-4 rounded-xl shadow-sm">
        {!sessionChecked ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">인증 세션을 확인하고 있습니다...</p>
          </div>
        ) : !success ? (
          <>
            <p className="text-gray-600 text-sm mb-8 text-center">
              새로운 비밀번호를 입력해 주세요.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="6자 이상 입력"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="비밀번호 다시 입력"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition disabled:bg-gray-400 mt-4"
              >
                {loading ? '변경 중...' : '비밀번호 변경하기'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">비밀번호가 변경되었습니다.</h2>
            <p className="text-gray-600 text-sm mb-8">
              잠시 후 로그인 페이지로 이동합니다.
            </p>
          </div>
        )}
      </main>

      <BottomNavbar />
    </div>
  )
}

