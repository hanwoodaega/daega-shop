'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupTermsPage() {
  const router = useRouter()
  const [allAgreed, setAllAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [thirdPartyAgreed, setThirdPartyAgreed] = useState(false)
  const [ageAgreed, setAgeAgreed] = useState(false)
  const [marketingAgreed, setMarketingAgreed] = useState(false)

  useEffect(() => {
    if (termsAgreed && privacyAgreed && thirdPartyAgreed && ageAgreed && marketingAgreed) {
      setAllAgreed(true)
    } else {
      setAllAgreed(false)
    }
  }, [termsAgreed, privacyAgreed, thirdPartyAgreed, ageAgreed, marketingAgreed])

  const handleAllAgree = (checked: boolean) => {
    setAllAgreed(checked)
    setTermsAgreed(checked)
    setPrivacyAgreed(checked)
    setThirdPartyAgreed(checked)
    setAgeAgreed(checked)
    setMarketingAgreed(checked)
  }

  const handleNext = () => {
    if (termsAgreed && privacyAgreed && thirdPartyAgreed && ageAgreed) {
      // 약관 동의 정보를 세션 스토리지에 저장
      const termsData = {
        service: termsAgreed,
        privacy: privacyAgreed,
        third_party: thirdPartyAgreed,
        age14: ageAgreed,
        marketing: marketingAgreed,
      }
      sessionStorage.setItem('signup_terms', JSON.stringify(termsData))
      router.push('/auth/signup')
    }
  }

  const isNextEnabled = termsAgreed && privacyAgreed && thirdPartyAgreed && ageAgreed

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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              약관 동의
            </h1>
          </div>
          
        </div>
      </header>
      
      <main className="flex-1 bg-white flex items-start justify-center pt-6 pb-24 px-6">
        <div className="max-w-md w-full">
          <div className="space-y-3 mb-6">
            {/* 전체 동의 */}
            <div className="py-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={(e) => handleAllAgree(e.target.checked)}
                  className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                  style={{ 
                    backgroundImage: allAgreed 
                      ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                      : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                    backgroundSize: '80%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <span className="ml-2 text-lg text-gray-900 font-bold">전체 동의하기</span>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">이용약관, 개인정보 처리, 제3자 제공, 만 14세 이상 확인 및 마케팅 정보 수신(선택)을 포함합니다.</p>
            </div>

            {/* 이용약관 (필수) */}
            <div className="py-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => {
                      setTermsAgreed(e.target.checked)
                      if (!e.target.checked) setAllAgreed(false)
                    }}
                    className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                    style={{ 
                      backgroundImage: termsAgreed 
                        ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                        : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundSize: '80%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }}
                  />
                  <span className="ml-2 text-base font-semibold">
                    <span className="text-blue-900">필수</span>
                    <span className="ml-1 text-gray-900">이용약관 동의</span>
                  </span>
                </div>
                <Link href="/terms" target="_blank" className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                  보기
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">서비스 이용에 필요한 기본 약관입니다.</p>
            </div>

            {/* 개인정보처리방침 (필수) */}
            <div className="py-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => {
                      setPrivacyAgreed(e.target.checked)
                      if (!e.target.checked) setAllAgreed(false)
                    }}
                    className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                    style={{ 
                      backgroundImage: privacyAgreed 
                        ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                        : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundSize: '80%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }}
                  />
                  <span className="ml-2 text-base font-semibold">
                    <span className="text-blue-900">필수</span>
                    <span className="ml-1 text-gray-900">개인정보 수집 및 이용 동의</span>
                  </span>
                </div>
                <Link href="/privacy" target="_blank" className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                  보기
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">회원가입, 주문/배송, 고객 상담을 위해 개인정보를 수집·이용합니다.</p>
            </div>

            {/* 개인정보 제3자 제공 동의 (필수) */}
            <div className="py-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={thirdPartyAgreed}
                    onChange={(e) => {
                      setThirdPartyAgreed(e.target.checked)
                      if (!e.target.checked) setAllAgreed(false)
                    }}
                    className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                    style={{ 
                      backgroundImage: thirdPartyAgreed 
                        ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                        : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                      backgroundSize: '80%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }}
                  />
                  <span className="ml-2 text-base font-semibold">
                    <span className="text-blue-900">필수</span>
                    <span className="ml-1 text-gray-900">개인정보 제3자 제공 동의</span>
                  </span>
                </div>
                <Link href="/privacy" target="_blank" className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                  보기
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">배송업체 및 결제대행사에 서비스 제공을 위한 정보가 제공됩니다.</p>
            </div>

            {/* 본인은 만 14세 이상입니다 (필수) */}
            <div className="py-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageAgreed}
                  onChange={(e) => {
                    setAgeAgreed(e.target.checked)
                    if (!e.target.checked) setAllAgreed(false)
                  }}
                  className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                  style={{ 
                    backgroundImage: ageAgreed 
                      ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                      : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                    backgroundSize: '80%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <span className="ml-2 text-base font-semibold">
                  <span className="text-blue-900">필수</span>
                  <span className="ml-1 text-gray-900">본인은 만 14세 이상입니다</span>
                </span>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">개인정보보호법에 따라 만 14세 미만은 가입이 제한됩니다.</p>
            </div>

            {/* 마케팅 정보 수신 동의 (선택) */}
            <div className="py-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingAgreed}
                  onChange={(e) => {
                    setMarketingAgreed(e.target.checked)
                    if (!e.target.checked) setAllAgreed(false)
                  }}
                  className="w-6 h-6 appearance-none bg-white border border-gray-500 rounded-full focus:ring-blue-900 focus:ring-2 checked:bg-blue-900 checked:border-blue-900 cursor-pointer"
                  style={{ 
                    backgroundImage: marketingAgreed 
                      ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")'
                      : 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 8l3 3 7-7\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                    backgroundSize: '80%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <span className="ml-2 text-base font-semibold">
                  <span className="text-gray-500">선택</span>
                  <span className="ml-1 text-gray-900">마케팅 정보 수신 동의</span>
                </span>
              </label>
              <p className="ml-8 mt-1 text-sm text-gray-600">할인 혜택 및 이벤트 소식을 받아볼 수 있습니다.</p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleNext}
              disabled={!isNextEnabled}
              className="w-full bg-blue-900 text-white py-3 rounded-none font-semibold hover:bg-blue-950 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

