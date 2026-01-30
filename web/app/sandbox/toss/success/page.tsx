'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TossSandboxSuccessPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('결제 승인 중입니다...')
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setMessage('결제 승인 정보가 없습니다.')
      return
    }

    const confirmPayment = async () => {
      try {
        const res = await fetch('/api/payments/toss/sandbox/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || '결제 승인에 실패했습니다.')
        }

        setStatus('success')
        setMessage('결제를 완료했어요')
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || '결제 승인에 실패했습니다.')
      }
    }

    confirmPayment()
  }, [paymentKey, orderId, amount])

  return (
    <div className="min-h-screen bg-white">
      <main className="w-full flex flex-col items-center px-6 py-6">
        <div className="w-full max-w-[540px]">
          {status === 'success' ? (
            <div className="flex flex-col items-center mt-[72px]">
              <img
                src="https://static.toss.im/illusts/check-blue-spot-ending-frame.png"
                width={120}
                height={120}
                alt="결제 완료"
              />
              <h2 className="mt-8 text-[24px] font-bold text-[#191f28]">{message}</h2>
              <div className="mt-[60px] flex w-full flex-col gap-4 text-[20px]">
                <div className="flex justify-between">
                  <span className="text-[17px] font-semibold text-[#333d48]">결제 금액</span>
                  <span className="text-[17px] text-[#4e5968]">{amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[17px] font-semibold text-[#333d48]">주문번호</span>
                  <span className="text-[17px] text-[#4e5968]">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[17px] font-semibold text-[#333d48]">paymentKey</span>
                  <span className="text-[17px] text-[#4e5968] break-all text-right">{paymentKey}</span>
                </div>
              </div>
              <div className="mt-8 flex w-full flex-col gap-4">
                <a
                  className="w-full rounded-lg bg-[#f2f4f6] px-6 py-3 text-center text-[17px] font-semibold text-[#4e5968]"
                  href="/sandbox/toss"
                >
                  다시 테스트하기
                </a>
                <a
                  className="w-full rounded-lg bg-[#f2f4f6] px-6 py-3 text-center text-[17px] font-semibold text-[#4e5968]"
                  href="https://docs.tosspayments.com/guides/v2/payment-widget/integration"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  결제 연동 문서가기
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center mt-[72px] h-[400px] justify-between">
              <div className="flex flex-col items-center">
                <img
                  src="https://static.toss.im/lotties/loading-spot-apng.png"
                  width={120}
                  height={120}
                  alt="로딩"
                />
                <h2 className="mt-8 text-[24px] font-bold text-[#191f28]">
                  {status === 'error' ? '결제에 실패했어요' : '결제 요청까지 성공했어요.'}
                </h2>
                <h4 className="mt-2 text-[17px] font-medium text-[#4e5968] text-center">
                  {status === 'error' ? message : '결제 승인하고 완료해보세요.'}
                </h4>
              </div>
              {status === 'error' && (
                <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
