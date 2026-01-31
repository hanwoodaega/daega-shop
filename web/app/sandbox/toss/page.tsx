'use client'

import { useEffect, useRef, useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

const DEFAULT_AMOUNT = {
  currency: 'KRW',
  value: 50000,
}

function generateOrderId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function TossSandboxPage() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('card')
  const tossPaymentsRef = useRef<Awaited<ReturnType<typeof loadTossPayments>> | null>(null)

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!clientKey) {
      setError('NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.')
      return
    }

    const init = async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey)
        tossPaymentsRef.current = tossPayments
        setReady(true)
      } catch (err: any) {
        setError(err?.message || '토스 위젯 초기화에 실패했습니다.')
      }
    }

    init()
  }, [])

  const handleRequestPayment = async () => {
    if (!tossPaymentsRef.current) return
    const orderId = generateOrderId()
    setIsPaying(true)
    setError(null)

    try {
      const methodMap: Record<string, { method: string; easyPay?: { provider: string } }> = {
        card: { method: 'CARD' },
        virtual: { method: 'VIRTUAL_ACCOUNT' },
        transfer: { method: 'TRANSFER' },
        naverpay: { method: 'EASY_PAY', easyPay: { provider: 'NAVERPAY' } },
        kakaopay: { method: 'EASY_PAY', easyPay: { provider: 'KAKAOPAY' } },
        tosspay: { method: 'EASY_PAY', easyPay: { provider: 'TOSSPAY' } },
        samsungpay: { method: 'EASY_PAY', easyPay: { provider: 'SAMSUNGPAY' } },
        applepay: { method: 'EASY_PAY', easyPay: { provider: 'APPLEPAY' } },
      }

      const methodConfig = methodMap[selectedMethod] || { method: 'CARD' }
      const paymentOptions: any = {
        amount: DEFAULT_AMOUNT.value,
        orderId,
        orderName: '테스트 주문',
        successUrl: `${window.location.origin}/sandbox/toss/success`,
        failUrl: `${window.location.origin}/sandbox/toss/fail`,
        customerName: '테스트 고객',
        customerEmail: 'test@example.com',
      }

      if (methodConfig.easyPay) {
        paymentOptions.easyPay = methodConfig.easyPay
      }

      await (tossPaymentsRef.current as any).requestPayment(methodConfig.method, paymentOptions)
    } catch (err: any) {
      setError(err?.message || '결제 요청에 실패했습니다.')
      setIsPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="w-full flex flex-col items-center px-6 py-6">
        <div className="w-full max-w-[540px]">
          <h2 className="mb-4 text-[18px] font-semibold text-[#191f28]">결제 방법</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'card', label: '신용/체크카드' },
                { key: 'virtual', label: '가상계좌' },
                { key: 'transfer', label: '계좌이체' },
                { key: 'tosspay', label: '토스페이' },
                { key: 'kakaopay', label: '카카오페이' },
                { key: 'naverpay', label: '네이버페이' },
                { key: 'samsungpay', label: '삼성페이' },
                { key: 'applepay', label: '애플페이' },
              ].map((item) => {
                const isSelected = selectedMethod === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedMethod(item.key)}
                    className={`w-full rounded-lg border px-3 py-4 text-center text-[15px] font-semibold transition ${
                      isSelected
                        ? 'border-[#3282f6] bg-[#eff6ff] text-[#1d4ed8]'
                        : 'border-[#e5e8eb] bg-white text-[#191f28] hover:border-[#c7d2fe]'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
            <div
              id="toss-payment-widget"
              className="w-full rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] px-4 py-6 text-center text-sm text-[#6b7280]"
            >
              토스 위젯을 넣을 빈 컨테이너
            </div>
          </div>
          <div className="px-6 mt-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleRequestPayment}
              disabled={!ready || isPaying}
              className="w-full rounded-lg bg-[#3282f6] px-6 py-3 text-[17px] font-semibold text-[#f9fcff] disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isPaying ? '결제 중...' : ready ? '결제하기' : '위젯 준비 중...'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
