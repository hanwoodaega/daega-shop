'use client'

import { useRouter } from 'next/navigation'

interface LoginPromptModalProps {
  show: boolean
  onClose: () => void
  /** 비회원 주문 클릭 시 호출 (예: 체크아웃으로 이동) */
  onGuestCheckout?: () => void
  /** 로그인 후 리다이렉트할 URL (제공 시에만 next 사용) */
  loginNextUrl?: string
  /** 로그인 페이지로 가기 직전 (예: 비회원 장바구니 줄 sessionStorage 저장) */
  onBeforeLogin?: () => void
}

export default function LoginPromptModal({
  show,
  onClose,
  onGuestCheckout,
  loginNextUrl,
  onBeforeLogin,
}: LoginPromptModalProps) {
  const router = useRouter()

  if (!show) return null

  const handleGuest = () => {
    onClose()
    onGuestCheckout?.()
  }

  const handleLogin = () => {
    onBeforeLogin?.()
    if (loginNextUrl) {
      router.push(`/auth/login?next=${encodeURIComponent(loginNextUrl)}`)
    } else {
      router.push('/auth/login')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-base font-medium text-gray-900 mb-1">로그인이 필요합니다.</p>
        <p className="text-sm text-gray-600 mb-5">주문을 계속하시려면 로그인해주세요.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleGuest}
            className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            비회원 주문
          </button>
          <button
            type="button"
            onClick={handleLogin}
            className="flex-1 py-3 rounded-lg bg-primary-800 text-white font-semibold hover:bg-primary-900 transition"
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  )
}
