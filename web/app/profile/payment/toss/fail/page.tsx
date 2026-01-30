'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TossBillingFailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('카드 등록에 실패했습니다.')

  useEffect(() => {
    const errorMessage = searchParams.get('message')
    if (errorMessage) {
      setMessage(errorMessage)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">카드 등록 실패</h1>
        <p className="text-sm text-red-600 mb-4">{message}</p>
        <button
          type="button"
          onClick={() => router.replace('/profile/payment')}
          className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition"
        >
          돌아가기
        </button>
      </div>
    </div>
  )
}
