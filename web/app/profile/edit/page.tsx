'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'

function ProfileEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, signOut } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  
  // 원래 값 저장 (변경 감지용)
  const [originalName, setOriginalName] = useState('')
  const [originalPhone, setOriginalPhone] = useState('')
  const [originalBirthday, setOriginalBirthday] = useState('')
  
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  
  // 전화번호 인증 관련 상태
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '-'
    const numbers = phoneNumber.replace(/[^0-9]/g, '')
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else if (numbers.length === 10) {
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
      }
    }
    return phoneNumber
  }

  // 생년월일 포맷팅 함수
  const formatBirthday = (birthdayValue: string) => {
    if (!birthdayValue || birthdayValue.length !== 8) return null
    return `${birthdayValue.slice(0, 4)}-${birthdayValue.slice(4, 6)}-${birthdayValue.slice(6, 8)}`
  }

  // 회원가입 방식 표시 함수
  const getSignupMethod = () => {
    if (!user) return null
    
    // user_metadata에서 provider 확인 (네이버는 여기에 저장됨)
    const metadataProvider = user.user_metadata?.provider
    
    // app_metadata에서 provider 확인 (일반 OAuth는 여기에 저장됨)
    const appProvider = (user as any).app_metadata?.provider
    
    // provider 우선순위: user_metadata > app_metadata
    const provider = metadataProvider || appProvider || 'email'
    
    switch (provider) {
      case 'kakao':
        return '카카오 계정 가입'
      case 'naver':
        return '네이버 계정 가입'
      case 'email':
      default:
        return '이메일 가입'
    }
  }

  // 로그아웃 처리
  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut()
      router.push('/')
    }
  }

  // 탈퇴 처리
  const handleDeleteAccount = async () => {
    if (confirm('정말 탈퇴하시겠습니까? 탈퇴 후에는 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
      try {
        // TODO: 실제 탈퇴 API 구현 필요
        // await supabase.auth.admin.deleteUser(user!.id)
        // 또는 사용자 데이터 삭제 후 로그아웃
        alert('탈퇴 기능은 준비 중입니다.')
      } catch (error) {
        console.error('탈퇴 실패:', error)
        alert('탈퇴 처리 중 오류가 발생했습니다.')
      }
    }
  }

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

  // URL 파라미터로 수정 모드 진입 확인
  useEffect(() => {
    const editMode = searchParams.get('edit')
    setIsEditingProfile(editMode === 'true')
  }, [searchParams])

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, phone, birthday')
        .eq('id', user!.id)
        .single()

      if (error) throw error

      if (data) {
        const loadedName = data.name || ''
        const loadedPhone = data.phone || ''
        let loadedBirthday = ''
        if (data.birthday) {
          const date = new Date(data.birthday)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          loadedBirthday = `${year}${month}${day}`
        }
        
        setName(loadedName)
        setPhone(loadedPhone)
        setBirthday(loadedBirthday)
        setNewPhone('')
        
        // 원래 값 저장
        setOriginalName(loadedName)
        setOriginalPhone(loadedPhone)
        setOriginalBirthday(loadedBirthday)
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
      // 전화번호가 변경된 경우 인증 확인
      const phoneToSave = newPhone ? newPhone.replace(/[^0-9]/g, '') : phone.replace(/[^0-9]/g, '')
      const { data: userData } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user!.id)
        .single()
      
      const originalPhoneNumbers = userData?.phone?.replace(/[^0-9]/g, '') || ''

      // 전화번호가 변경되었고 인증이 완료되지 않은 경우
      if (phoneToSave !== originalPhoneNumbers && !isPhoneVerified) {
        setMessage({ type: 'error', text: '전화번호 변경 시 인증이 필요합니다.' })
        setSaving(false)
        return
      }

      // 생년월일을 YYYY-MM-DD 형식으로 변환
      let birthdayToSave = null
      if (birthday && birthday.length === 8) {
        const year = birthday.slice(0, 4)
        const month = birthday.slice(4, 6)
        const day = birthday.slice(6, 8)
        // 유효한 날짜인지 확인
        const date = new Date(`${year}-${month}-${day}`)
        if (!isNaN(date.getTime()) && 
            date.getFullYear() === parseInt(year) && 
            date.getMonth() + 1 === parseInt(month) && 
            date.getDate() === parseInt(day)) {
          birthdayToSave = `${year}-${month}-${day}`
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          phone: phoneToSave,
          birthday: birthdayToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id)

      if (error) throw error

      setMessage({ type: 'success', text: '회원정보가 수정되었습니다.' })
      
      // 원래 값 업데이트
      setOriginalName(name.trim())
      setOriginalPhone(phoneToSave)
      // 생년월일은 8자리 형식으로 저장
      if (birthdayToSave) {
        const parts = birthdayToSave.split('-')
        if (parts.length === 3) {
          setOriginalBirthday(`${parts[0]}${parts[1]}${parts[2]}`)
        } else {
          setOriginalBirthday(birthday)
        }
      } else {
        setOriginalBirthday('')
      }
      
      setIsEditingProfile(false)
      setIsPhoneVerified(false)
      setIsVerifyingPhone(false)
      setNewPhone('')
      setVerificationCode('')
      
      // 3초 후 회원정보 수정 페이지(읽기 모드)로 이동
      setTimeout(() => {
        router.push('/profile/edit')
      }, 2000)
    } catch (error: any) {
      console.error('회원정보 수정 실패:', error)
      setMessage({ type: 'error', text: '회원정보 수정에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // 인증번호 발송
  const handleSendVerificationCode = async () => {
    if (!newPhone || newPhone.replace(/[^0-9]/g, '').length < 10) {
      setMessage({ type: 'error', text: '올바른 전화번호를 입력해주세요.' })
      return
    }

    setIsSendingCode(true)
    setMessage(null)

    try {
      // TODO: 실제 인증번호 발송 API 연동
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone.replace(/[^0-9]/g, '') }),
      })

      if (!response.ok) {
        throw new Error('인증번호 발송에 실패했습니다.')
      }

      setIsVerifyingPhone(true)
      setMessage({ type: 'success', text: '인증번호가 발송되었습니다.' })
    } catch (error: any) {
      console.error('인증번호 발송 실패:', error)
      setMessage({ type: 'error', text: error.message || '인증번호 발송에 실패했습니다.' })
    } finally {
      setIsSendingCode(false)
    }
  }

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: '인증번호 6자리를 입력해주세요.' })
      return
    }

    setMessage(null)

    try {
      // TODO: 실제 인증번호 확인 API 연동
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: newPhone.replace(/[^0-9]/g, ''),
          code: verificationCode 
        }),
      })

      if (!response.ok) {
        throw new Error('인증번호가 올바르지 않습니다.')
      }

      setIsPhoneVerified(true)
      setPhone(newPhone.replace(/[^0-9]/g, ''))
      setMessage({ type: 'success', text: '전화번호 인증이 완료되었습니다.' })
      setIsVerifyingPhone(false)
    } catch (error: any) {
      console.error('인증번호 확인 실패:', error)
      setMessage({ type: 'error', text: error.message || '인증번호 확인에 실패했습니다.' })
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">회원정보 수정</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
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
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 회원정보 수정 전용 헤더 */}
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
          
          {/* 중앙: 제목 (absolute로 완전 중앙 배치) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              회원정보 수정
            </h1>
          </div>
          
          {/* 오른쪽: 장바구니 버튼 */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => router.push('/cart')}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
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
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">

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

        {/* 기본 정보 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-normal text-gray-500">기본 정보</h2>
            {!isEditingProfile && (
              <button
                onClick={() => {
                  router.push('/profile/edit?edit=true')
                }}
                className="px-2 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1"
              >
                <span>수정</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            /* 읽기 전용 표시 */
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-normal text-gray-500">이름</div>
                  <div className="text-base font-semibold text-gray-900">{name || '-'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-normal text-gray-500">전화번호</div>
                  <div className="text-base font-semibold text-gray-900">{formatPhoneNumber(phone)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-normal text-gray-500">이메일</div>
                  <div className="text-base font-semibold text-gray-900">{user.email || '-'}</div>
                </div>
              </div>

              {/* 부가 정보 섹션 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-normal text-gray-500">부가 정보</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => {
                        router.push('/profile/edit?edit=true')
                      }}
                      className="px-2 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-1"
                    >
                      <span>수정</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-normal text-gray-500">생년월일</div>
                    <div className={`text-base font-semibold ${formatBirthday(birthday) ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formatBirthday(birthday) || '아직 입력되지 않았어요.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 회원가입 정보 섹션 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-normal text-gray-500">회원가입 정보</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-normal text-gray-500">가입 방식</div>
                    <div className="text-base font-semibold text-gray-900">
                      {getSignupMethod() || '이메일 가입'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 나가기 섹션 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-normal text-gray-500">나가기</h2>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleSignOut}
                    className="text-base font-medium text-gray-900 hover:text-gray-700 transition"
                  >
                    로그아웃
                  </button>
                  <div>
                    <button
                      onClick={handleDeleteAccount}
                      className="text-sm font-normal text-gray-400 hover:text-gray-500 transition"
                    >
                      탈퇴하기
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* 수정 폼 */
            <form onSubmit={handleSaveProfile} className="space-y-4">
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
                전화번호 *
              </label>
              {(() => {
                const originalPhone = phone.replace(/[^0-9]/g, '')
                const currentPhone = newPhone || originalPhone
                const isPhoneChanged = currentPhone !== originalPhone
                
                if (isPhoneVerified) {
                  return (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={formatPhoneNumber(phone)}
                        disabled
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <span className="text-xs text-green-600 font-medium">인증완료</span>
                    </div>
                  )
                }
                
                return (
                  <>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="tel"
                        value={newPhone || phone}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/[^0-9]/g, '')
                          setNewPhone(numbers)
                          if (numbers === originalPhone) {
                            setIsPhoneVerified(false)
                            setIsVerifyingPhone(false)
                            setVerificationCode('')
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="01012345678"
                        maxLength={11}
                        disabled={isVerifyingPhone}
                        required
                      />
                      {isPhoneChanged && (
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={isSendingCode || !newPhone || newPhone.replace(/[^0-9]/g, '').length < 10}
                          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isSendingCode ? '발송중...' : '인증번호 발송'}
                        </button>
                      )}
                    </div>
                    {isVerifyingPhone && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => {
                            const code = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                            setVerificationCode(code)
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="인증번호 6자리"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verificationCode.length !== 6}
                          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          인증확인
                        </button>
                      </div>
                    )}
                    {isPhoneChanged && (
                      <p className="text-xs text-gray-500 mt-1">전화번호 변경 시 인증이 필요합니다.</p>
                    )}
                  </>
                )
              })()}
            </div>

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

            {/* 부가 정보 섹션 (수정 모드) */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-normal text-gray-500">부가 정보</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생년월일
                </label>
                <input
                  type="text"
                  value={(() => {
                    // 8자리 숫자가 입력되면 하이픈 추가하여 표시
                    if (birthday.length === 8) {
                      return `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6, 8)}`
                    }
                    return birthday
                  })()}
                  onChange={(e) => {
                    // 하이픈 제거하고 숫자만 저장
                    const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 8)
                    setBirthday(numbers)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="19900101"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  생일 쿠폰 등 특별 혜택을 받으실 수 있습니다 (YYYYMMDD 형식)
                </p>
              </div>
            </div>

              {(() => {
                // 변경 감지
                const phoneToCheck = newPhone || phone
                const isNameChanged = name.trim() !== originalName
                const isPhoneChanged = phoneToCheck.replace(/[^0-9]/g, '') !== originalPhone.replace(/[^0-9]/g, '')
                const isBirthdayChanged = birthday !== originalBirthday
                const hasChanges = isNameChanged || isPhoneChanged || isBirthdayChanged
                
                // 전화번호가 변경된 경우 인증 필요
                const canSave = hasChanges && (!isPhoneChanged || isPhoneVerified)
                
                return (
            <button
              type="submit"
                    disabled={!canSave || saving}
                    className="w-full bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                    {saving ? '저장 중...' : '수정하기'}
            </button>
                )
              })()}
          </form>
          )}
        </div>

      </main>

      <BottomNavbar />
    </div>
  )
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">회원정보 수정</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <BottomNavbar />
      </div>
    }>
      <ProfileEditContent />
    </Suspense>
  )
}

