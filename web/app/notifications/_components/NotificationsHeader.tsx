'use client'

import { useRouter } from 'next/navigation'

export default function NotificationsHeader() {
  const router = useRouter()

  return (
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
          <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">알림</h1>
        </div>
      </div>
    </header>
  )
}


