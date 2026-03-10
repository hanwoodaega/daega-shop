'use client'

import { useRouter } from 'next/navigation'

export default function ProfileNoticesPage() {
  const router = useRouter()

  const notices = [
    {
      id: 1,
      title: '신규 회원 가입 혜택 안내',
      content: '신규 회원 가입 시 첫 구매 쿠폰을 받아보세요!',
      date: '2024-01-15',
      isImportant: true,
    },
    {
      id: 2,
      title: '배송 안내',
      content: '주문 후 1-2일 내 배송이 시작됩니다.',
      date: '2024-01-10',
      isImportant: false,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* PC 전용: DOM 순서상 먼저 배치해 PC에서 모바일 UI 플래시 방지 */}
      <div className="hidden lg:block flex-1 w-full">
        <div className="container mx-auto px-4 py-6 pb-6 max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 text-center">공지사항</h2>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="border-b border-gray-200 pb-4 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">공지사항 목록</h3>
            </div>
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">공지사항이 없습니다.</div>
              ) : (
                notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {notice.isImportant && (
                          <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded">
                            중요
                          </span>
                        )}
                        <h4 className="text-base font-semibold text-gray-900">{notice.title}</h4>
                      </div>
                      <span className="text-sm text-gray-500">{notice.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                  </div>
                ))
              )}
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
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">공지사항</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* 모바일 전용 콘텐츠 */}
        <div className="lg:hidden">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              공지사항
            </h2>
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">공지사항이 없습니다.</div>
              ) : (
                notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {notice.isImportant && (
                          <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded">
                            중요
                          </span>
                        )}
                        <h3 className="text-base font-semibold text-gray-900">{notice.title}</h3>
                      </div>
                      <span className="text-sm text-gray-500">{notice.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{notice.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

