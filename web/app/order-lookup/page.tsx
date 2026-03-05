'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { OrderWithItems } from '@/lib/order/order-types'
import { formatPrice } from '@/lib/utils/utils'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusTextColor, getRefundStatusText } from '@/lib/order/order-utils'

function getTrackingUrl(trackingNumber: string): string {
  return `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${trackingNumber}`
}

function OrderLookupResult({ order }: { order: OrderWithItems }) {
  const [expanded, setExpanded] = useState(true)

  const handleTrackDelivery = () => {
    if (!order.tracking_number) return
    window.open(getTrackingUrl(order.tracking_number), '_blank')
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <p className="text-sm text-gray-600 mb-1">
          주문일시: {new Date(order.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {order.order_number && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              주문번호: <span className="font-mono text-primary-900 font-semibold">{order.order_number}</span>
            </p>
            <span className={`text-sm font-semibold ${getStatusTextColor(order.status)}`}>
              {getStatusText(order.status, order.delivery_type)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {order.order_items && order.order_items.length > 0 && (
          <div className="mb-4">
            {!expanded ? (
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {order.order_items[0].product?.name || '상품'}
                    {order.order_items.length > 1 && (
                      <span className="text-gray-500 ml-1">외 {order.order_items.length - 1}개 상품</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatPrice(order.order_items[0].price)}원 × {order.order_items[0].quantity}개
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.product?.name || '상품'}</p>
                      <p className="text-sm text-gray-600">
                        {formatPrice(item.price)}원 × {item.quantity}개
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full py-2 text-sm text-primary-800 font-medium hover:bg-gray-50 rounded transition"
            >
              {expanded ? '접기 ▲' : '자세히 보기 ▼'}
            </button>
          </div>
        )}

        {expanded && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm">
              <span className="text-gray-600">배달 유형: </span>
              <span className="text-gray-900 font-medium">{getDeliveryTypeText(order.delivery_type)}</span>
            </div>
            {order.delivery_time && (order.delivery_type === 'pickup' || order.delivery_type === 'quick') && (
              <div className="text-sm">
                <span className="text-gray-600">
                  {order.delivery_type === 'pickup' ? '픽업 시간: ' : '배달 시간: '}
                </span>
                <span className="text-gray-900 font-medium">{order.delivery_time}</span>
              </div>
            )}
            {!order.gift_token && (
              <>
                <div className="text-sm">
                  <span className="text-gray-600">배송지: </span>
                  <span className="text-gray-900">{order.shipping_address}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">수령인: </span>
                  <span className="text-gray-900">{order.shipping_name}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">연락처: </span>
                  <span className="text-gray-900">{formatPhoneNumber(order.shipping_phone)}</span>
                </div>
                {order.delivery_note && (
                  <div className="text-sm">
                    <span className="text-gray-600">요청사항: </span>
                    <span className="text-gray-900">{order.delivery_note}</span>
                  </div>
                )}
              </>
            )}
            {order.refund_status && (
              <div className="text-sm pt-2 border-t">
                <span className="text-gray-600">환불 상태: </span>
                <span className="font-medium text-orange-600">{getRefundStatusText(order.refund_status)}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t mt-3 pt-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-semibold text-gray-900">총 결제금액</span>
            <span className="text-xl font-bold text-primary-900">{formatPrice(order.total_amount)}원</span>
          </div>
          {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
            <button
              type="button"
              onClick={handleTrackDelivery}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              배송조회
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type Step = 'form' | 'otp' | 'result'

function OrderLookupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('form')
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [doneMessage, setDoneMessage] = useState(false)

  useEffect(() => {
    const num = searchParams?.get('order_number') ?? ''
    const ph = searchParams?.get('phone') ?? ''
    if (num) setOrderNumber(num)
    if (ph) setPhone(ph)
    if (searchParams?.get('done') === '1') setDoneMessage(true)
  }, [searchParams])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = orderNumber.trim()
    const ph = phone.trim()
    if (!num || !ph) {
      setError('주문번호와 휴대폰 번호를 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/orders/lookup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: num, phone: ph }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '인증번호 발송에 실패했습니다.')
        return
      }
      setStep('otp')
      setOtpCode('')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = orderNumber.trim()
    const ph = phone.trim()
    const code = otpCode.trim()
    if (!num || !ph || !code) {
      setError('인증번호를 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/orders/lookup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: num, phone: ph, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '인증에 실패했습니다.')
        return
      }
      setOrder(data.order)
      setStep('result')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForm = () => {
    setStep('form')
    setOtpCode('')
    setError('')
  }

  const handleBackToOtp = () => {
    setStep('otp')
    setOrder(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            type="button"
            onClick={() => (step === 'form' ? router.back() : step === 'otp' ? handleBackToForm() : handleBackToOtp())}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문조회</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        {doneMessage && step === 'form' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            주문이 완료되었습니다. 아래에서 주문번호와 휴대폰 번호로 인증 후 조회하세요.
          </div>
        )}

        {step === 'form' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              주문 시 입력한 <strong>주문번호</strong>와 <strong>휴대폰 번호</strong>를 입력한 뒤, 인증번호를 받아 본인 확인 후 주문 내역을 조회할 수 있습니다.
            </p>
            <form onSubmit={handleSendOtp} className="space-y-4 mb-8">
              <div>
                <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1">
                  주문번호
                </label>
                <input
                  id="order_number"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="예: 20250303-ABCD"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  휴대폰 번호
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="숫자만 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoComplete="tel"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-800 text-white py-3 rounded-lg font-medium hover:bg-primary-900 disabled:opacity-50 transition"
              >
                {loading ? '인증번호 발송 중...' : '인증번호 받기'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
              <p className="font-medium">{phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</p>
              <p>위 번호로 발송된 6자리 인증번호를 입력해주세요.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4 mb-8">
              <div>
                <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700 mb-1">
                  인증번호
                </label>
                <input
                  id="otp_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6자리 숫자"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-primary-800 text-white py-3 rounded-lg font-medium hover:bg-primary-900 disabled:opacity-50 transition"
              >
                {loading ? '확인 중...' : '인증하기'}
              </button>
            </form>
          </>
        )}

        {step === 'result' && order && <OrderLookupResult order={order} />}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function OrderLookupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문조회</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-800 border-t-transparent" />
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <OrderLookupContent />
    </Suspense>
  )
}
