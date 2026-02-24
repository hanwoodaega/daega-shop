'use client'

import { usePathname, useRouter } from 'next/navigation'
import ConfirmModal from './ConfirmModal'

interface LoginPromptProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export default function LoginPrompt({
  isOpen,
  onClose,
  title = '로그인이 필요합니다',
  message = '이 기능을 사용하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?'
}: LoginPromptProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleConfirm = () => {
    const next = encodeURIComponent(pathname || '/')
    router.push(`/auth/login?next=${next}`)
    onClose()
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText="로그인"
      cancelText="취소"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  )
}



