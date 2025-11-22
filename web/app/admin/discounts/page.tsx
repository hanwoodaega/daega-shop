'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DiscountsPage() {
  const router = useRouter()

  useEffect(() => {
    // 할인 관리 페이지는 프로모션 관리 페이지로 통합되었습니다
    router.replace('/admin/promotions')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">할인 관리 기능은 프로모션 관리로 통합되었습니다.</p>
        <p className="text-sm text-gray-500">자동으로 이동합니다...</p>
      </div>
    </div>
  )
}
