'use client'

import { useRouter } from 'next/navigation'

interface LoginPromptModalProps {
  show: boolean
  onClose: () => void
}

export default function LoginPromptModal({ show, onClose }: LoginPromptModalProps) {
  const router = useRouter()

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-5">
        <div className="text-base font-medium mb-2">로그인이 필요합니다.</div>
        <div className="text-sm text-gray-600 mb-5">주문을 계속하시려면 로그인해 주세요.</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-3 rounded-lg border">취소</button>
          <button 
            onClick={() => router.push(`/auth/login?next=${encodeURIComponent('/cart')}`)} 
            className="py-3 rounded-lg bg-primary-800 text-white font-semibold"
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  )
}

