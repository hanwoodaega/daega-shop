'use client'

import { useRouter } from 'next/navigation'

export default function ProfileSupportPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC 전용: DOM 순서상 먼저 배치해 PC에서 모바일 UI 플래시 방지 */}
      <div className="hidden lg:block flex-1 w-full">
        <div className="container mx-auto px-4 py-6 pb-6 max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 text-center">고객센터</h2>
          </div>

          <div className="space-y-4 w-full">
            {/* 고객센터 연락처 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                고객센터 연락처
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900 font-medium">전화: 061-724-1223</p>
                <p className="text-gray-600">운영시간: 매일 09:00 ~ 18:00</p>
              </div>
            </div>

            {/* 매장 정보 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                매장 정보
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900 font-medium">대가정육마트</p>
                <p className="text-gray-600">주소: 전라남도 순천시 해룡면 상성길 183</p>
                <p className="text-gray-600">영업시간: 매일 09:00 ~ 21:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 전용 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">고객센터</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* 모바일 전용 콘텐츠 */}
        <div className="lg:hidden">
          <div className="space-y-4 w-full">
            {/* 고객센터 연락처 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                고객센터 연락처
              </h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900 font-medium">전화: 061-724-1223</p>
                <p className="text-gray-600">운영시간: 매일 09:00 ~ 18:00</p>
              </div>
            </div>

            {/* 매장 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                매장 정보
              </h2>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900 font-medium">대가정육마트</p>
                <p className="text-gray-600">주소: 전라남도 순천시 해룡면 상성길 183</p>
                <p className="text-gray-600">영업시간: 매일 09:00 ~ 21:00</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

