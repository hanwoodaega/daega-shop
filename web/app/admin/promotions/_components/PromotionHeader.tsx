'use client'

import { useRouter } from 'next/navigation'

interface PromotionHeaderProps {
  onCreateClick: () => void
}

export default function PromotionHeader({ onCreateClick }: PromotionHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-end gap-2 mb-6">
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
  )
}

