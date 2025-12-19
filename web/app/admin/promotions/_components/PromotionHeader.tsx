'use client'

import { useRouter } from 'next/navigation'

interface PromotionHeaderProps {
  onCreateClick: () => void
}

export default function PromotionHeader({ onCreateClick }: PromotionHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        <button
          onClick={() => router.push('/admin')}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">프로모션 관리</h1>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          새 프로모션
        </button>
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          관리자 홈
        </button>
      </div>
    </div>
  )
}

