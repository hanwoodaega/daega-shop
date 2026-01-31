'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function TossFailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('결제에 실패했습니다.')
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const errorMessage = searchParams.get('message')
    const errorCode = searchParams.get('code')
    const orderId = searchParams.get('orderId')

    if (errorMessage) {
      setMessage(errorMessage)
    }
    if (errorCode) {
      setCode(errorCode)
    }

    if (orderId) {
      sessionStorage.removeItem(`toss_checkout_${orderId}`)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">결제 실패</h1>
        <p className="text-sm text-red-600 mb-2">{message}</p>
        {code && <p className="text-xs text-gray-500 mb-4">에러 코드: {code}</p>}
        <button
          type="button"
          onClick={() => router.replace('/checkout')}
          className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900 transition"
        >
          결제 다시 시도
        </button>
      </div>
    </div>
  )
}

export default function TossFailPage() {
  return (
    <Suspense fallback={null}>
      <TossFailContent />
    </Suspense>
  )
}
