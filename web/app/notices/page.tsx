'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'

export default function NoticesPage() {
  const router = useRouter()

  // 임시 공지사항 데이터 (나중에 DB에서 가져올 수 있음)
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
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로가기</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
          </div>

          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                공지사항이 없습니다.
              </div>
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
                      <h2 className="text-lg font-semibold text-gray-900">{notice.title}</h2>
                    </div>
                    <span className="text-sm text-gray-500">{notice.date}</span>
                  </div>
                  <p className="text-gray-600 mt-2">{notice.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

