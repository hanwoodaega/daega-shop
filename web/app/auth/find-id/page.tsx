'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavbar from '@/components/BottomNavbar'

export default function FindIdPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foundEmails, setFoundEmails] = useState<any[] | null>(null)

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFoundEmails(null)

    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '아이디 찾기에 실패했습니다.')
      }

      setFoundEmails(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 이메일 마스킹 처리 (ex: abcd***@naver.com)
  const maskEmail = (email: string) => {
    const [id, domain] = email.split('@')
    if (id.length <= 3) return `${id[0]}**@${domain}`
    return `${id.slice(0, 3)}${'*'.repeat(id.length - 3)}@${domain}`
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
          <h1 className="flex-1 text-center text-lg font-medium mr-10">아이디 찾기</h1>
        </div>
      </header>

      <main className="flex-1 bg-white p-6 max-w-md mx-auto w-full mt-4 rounded-xl shadow-sm">
        {!foundEmails ? (
          <>
            <p className="text-gray-600 text-sm mb-8">
              가입 시 입력하신 이름과 휴대폰 번호를 입력해 주세요.
            </p>

            <form onSubmit={handleFindId} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="휴대폰 번호 (- 없이 입력)"
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
                {loading ? '조회 중...' : '확인'}
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
            <h2 className="text-xl font-bold mb-2">아이디를 찾았습니다.</h2>
            <p className="text-gray-600 text-sm mb-8">
              입력하신 정보와 일치하는 아이디 목록입니다.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              {foundEmails.map((user, idx) => (
                <div key={idx} className="flex flex-col items-center py-2">
                  <span className="text-lg font-semibold text-gray-900">{maskEmail(user.email)}</span>
                  <span className="text-xs text-gray-500 mt-1">보안을 위해 일부 정보는 숨김 처리되었습니다.</span>
                  <span className="text-xs text-gray-500 mt-1">가입일: {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Link href="/auth/login" className="block w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition">
                로그인하러 가기
              </Link>
              <Link href="/auth/find-password" title="비밀번호 찾기" className="block w-full border border-gray-300 text-gray-700 py-4 rounded-lg font-bold hover:bg-gray-50 transition">
                비밀번호 찾기
              </Link>
            </div>
          </div>
        )}
      </main>

      <BottomNavbar />
    </div>
  )
}

