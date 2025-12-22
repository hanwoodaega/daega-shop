'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/supabase'
import BottomNavbar from '@/components/BottomNavbar'

export default function FindPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })

      if (error) throw error

      setIsSent(true)
    } catch (err: any) {
      setError(err.message || '비밀번호 재설정 이메일 전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center">
          <button onClick={() => router.back()} className="p-2 text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-medium mr-10">비밀번호 찾기</h1>
        </div>
      </header>

      <main className="flex-1 bg-white p-6 max-w-md mx-auto w-full mt-4 rounded-xl shadow-sm">
        {!isSent ? (
          <>
            <p className="text-gray-600 text-sm mb-8">
              가입하신 이메일 주소를 입력해 주세요.<br />
              비밀번호 재설정을 위한 안내 메일을 보내드립니다.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 주소</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="example@email.com"
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
                {loading ? '전송 중...' : '비밀번호 재설정 메일 발송'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">메일이 발송되었습니다.</h2>
            <p className="text-gray-600 text-sm mb-2">
              <span className="font-semibold text-gray-900">{email}</span> 주소로<br />
              비밀번호 재설정 링크를 보내드렸습니다.
            </p>
            <p className="text-gray-500 text-xs mb-8">
              메일이 오지 않았다면 스팸 메일함을 확인해 주세요.
            </p>

            <Link href="/auth/login" className="block w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition">
              로그인 화면으로 돌아가기
            </Link>
          </div>
        )}
      </main>

      <BottomNavbar />
    </div>
  )
}

