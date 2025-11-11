'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const isSocialLogin = user?.app_metadata?.provider !== 'email'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/profile/edit')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.id) {
      loadUserData()
    }
  }, [user?.id]) // ✅ user.id만 의존성으로 (무한 루프 방지)

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', user!.id)
        .single()

      if (error) throw error

      if (data) {
        setName(data.name || '')
        setPhone(data.phone || '')
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id)

      if (error) throw error

      setMessage({ type: 'success', text: '회원정보가 수정되었습니다.' })
      
      // 3초 후 프로필 페이지로 이동
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
    } catch (error: any) {
      console.error('회원정보 수정 실패:', error)
      setMessage({ type: 'error', text: '회원정보 수정에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }

    setChangingPassword(true)

    try {
      // 현재 비밀번호로 재인증
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('현재 비밀번호가 올바르지 않습니다.')
      }

      // 비밀번호 변경
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('비밀번호 변경 실패:', error)
      setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">회원정보 수정</h1>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 기본 정보 수정 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-bold mb-4">기본 정보</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  // 숫자만 추출 (하이픈 자동 제거)
                  const numbers = e.target.value.replace(/[^0-9]/g, '')
                  setPhone(numbers)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="01012345678"
                maxLength={11}
              />
              <p className="text-xs text-gray-500 mt-1">숫자만 입력하세요 (하이픈 없이)</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition disabled:bg-gray-400"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </form>
        </div>

        {/* 비밀번호 변경 */}
        {!isSocialLogin && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">비밀번호 변경</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호 *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="현재 비밀번호"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="새 비밀번호 (최소 6자)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인 *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="새 비밀번호 확인"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition disabled:bg-gray-400"
              >
                {changingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        )}

        {/* 소셜 로그인 안내 */}
        {isSocialLogin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              소셜 로그인({user.app_metadata?.provider})으로 가입한 계정은 비밀번호를 변경할 수 없습니다.
            </p>
          </div>
        )}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

