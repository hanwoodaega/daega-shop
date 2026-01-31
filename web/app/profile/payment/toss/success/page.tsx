'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function TossBillingSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('카드 등록을 처리하고 있습니다...')

  useEffect(() => {
    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')

    if (!authKey || !customerKey) {
      setStatus('error')
      setMessage('카드 등록 정보가 없습니다.')
      return
    }

    const issueBillingKey = async () => {
      try {
        const res = await fetch('/api/payments/toss/billing/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || '카드 등록에 실패했습니다.')
        }

        setStatus('success')
        setMessage('카드 등록이 완료되었습니다. 목록으로 이동합니다.')
        window.setTimeout(() => router.replace('/profile/payment'), 1200)
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || '카드 등록에 실패했습니다.')
      }
    }

    issueBillingKey()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">카드 등록</h1>
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
          {message}
        </p>
      </div>
    </div>
  )
}

export default function TossBillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <TossBillingSuccessContent />
    </Suspense>
  )
}
