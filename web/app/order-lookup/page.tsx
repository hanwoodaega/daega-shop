'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { OrderWithItems } from '@/lib/order/order-types'
import { formatPrice } from '@/lib/utils/utils'
import { formatPhoneNumber } from '@/lib/utils/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusTextColor } from '@/lib/order/order-utils'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth/auth-context'

function getCarrierCode(name?: string | null): string | undefined {
  const map: Record<string, string> = {
    'CJ대한통운': 'kr.cjlogistics',
    '롯데택배': 'kr.lotte',
    '로젠택배': 'kr.logen',
    '한진택배': 'kr.hanjin',
    '우체국택배': 'kr.epost',
    '경동택배': 'kr.kdexp',
    '합동택배': 'kr.hdexp',
    '대신택배': 'kr.daesin',
    '일양로지스': 'kr.ilyanglogis',
    '천일택배': 'kr.chunilps',
    '건영택배': 'kr.kunyoung',
  }
  return name ? map[name] : undefined
}

function getTrackingUrl(trackingNumber: string, carrierName?: string | null): string {
  const code = getCarrierCode(carrierName || '') || 'kr.lotte'
  return `https://tracker.delivery/#/${code}/${trackingNumber}`
}

const ORDER_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

function formatOrderDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('ko-KR', ORDER_DATE_OPTIONS)
}

function hideImageOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

const PREVIEW_ITEMS = 3

function OrderLookupResult({
  order,
  onCancel,
  cancelling,
}: {
  order: OrderWithItems
  onCancel: () => void
  cancelling: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const handleTrackDelivery = () => {
    if (!order.tracking_number) return
    window.open(getTrackingUrl(order.tracking_number, order.tracking_company), '_blank')
  }

  const copyOrderNumber = () => {
    if (order.order_number) {
      navigator.clipboard.writeText(order.order_number)
      toast.success('주문번호가 복사되었습니다.', { duration: 2000 })
    }
  }

  const statusText = getStatusText(order.status, order.delivery_type)
  const statusColorClass = getStatusTextColor(order.status)
  const shippingDisplay = order.gift_token ? '선물하기 주문' : (order.shipping_address || '-')
  const items = order.order_items || []
  const displayItems = expanded ? items : items.slice(0, PREVIEW_ITEMS)
  const deliveryTypeLabel = getDeliveryTypeText(order.delivery_type)

  return (
    <>
      {/* PC: 테이블 레이아웃 */}
      <div className="hidden lg:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <p className="text-base text-gray-600">
            주문번호: <span className="font-mono font-semibold text-gray-900">{order.order_number || '-'}</span>
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            주문일시: {formatOrderDate(order.created_at)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center py-3 px-4 font-semibold text-gray-700">상품명</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-40 min-w-[8rem]">가격</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">수량</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-44 min-w-[10rem]">배송상태</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-56 max-w-[16rem]">배송지</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-left align-middle">
                    <div className="flex items-center justify-start gap-3">
                      <div className="w-24 h-24 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.product?.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product?.name || ''}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          onError={hideImageOnError}
                          />
                        ) : null}
                      </div>
                      <span className="font-medium text-gray-900">{item.product?.name || '상품'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 w-40 min-w-[8rem]">{formatPrice(item.price)}원</td>
                  <td className="py-3 px-4 text-center text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-center w-44 min-w-[10rem]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={statusColorClass}>{statusText}</span>
                      {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
                        <span className="text-sm text-gray-500">
                          {order.tracking_company || '택배'} {order.tracking_number}
                        </span>
                      )}
                    </div>
                  </td>
                  {index === 0 ? (
                    <td className="py-3 px-4 text-center text-gray-600 align-middle w-56 max-w-[16rem]" rowSpan={order.order_items?.length ?? 1}>
                      {shippingDisplay}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 text-base">
          <span className="font-semibold text-gray-900">총 결제금액</span>
          <span className="text-xl font-bold text-primary-900">{formatPrice(order.total_amount)}원</span>
        </div>
        {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={handleTrackDelivery}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-base font-medium hover:bg-gray-50 transition"
            >
              배송조회
            </button>
          </div>
        )}
      </div>

      {/* 모바일: 회원 주문내역(OrderCard)과 동일 UI */}
      <div className="lg:hidden bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900 mb-0.5">
              {new Date(order.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).replace(/\. /g, '.').replace(/\.$/, '')}
            </p>
            {order.order_number && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-500">주문번호 {order.order_number}</span>
                <button
                  type="button"
                  onClick={copyOrderNumber}
                  aria-label="주문번호 복사"
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-base font-semibold ${statusColorClass}`}>{statusText}</span>
          </div>
        </div>

        <div className="border-t border-gray-100">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="px-5 py-4 flex gap-4 border-b border-gray-100 last:border-b-0"
            >
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                {item.product?.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product?.name || '상품'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={hideImageOnError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{deliveryTypeLabel}</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {item.product?.name || '상품'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold text-gray-900">{formatPrice(item.price)}원</span>
                  <span className="text-gray-500"> | {item.quantity}개</span>
                </p>
              </div>
            </div>
          ))}

          {items.length > PREVIEW_ITEMS && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full py-3 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 transition"
            >
              {expanded ? '접기' : `총 ${items.length}건 주문 펼쳐보기`}
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
          <span className="text-base font-bold text-primary-900">{formatPrice(order.total_amount)}원</span>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-wrap">
          {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
            <button
              type="button"
              onClick={handleTrackDelivery}
              className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-sky-100 text-primary-900 hover:bg-sky-200 transition"
            >
              배송조회
            </button>
          )}
          {order.status === 'ORDER_RECEIVED' && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
            >
              {cancelling ? '취소 중...' : '주문취소'}
            </button>
          )}
          {order.status === 'DELIVERED' && (
            <button
              type="button"
              onClick={() => { window.location.href = `/auth/login?next=${encodeURIComponent('/orders')}` }}
              className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-primary-100 text-primary-900 hover:bg-primary-200 transition"
            >
              구매확정
            </button>
          )}
          {order.status === 'CONFIRMED' && (
            <button
              type="button"
              onClick={() => { window.location.href = `/auth/login?next=${encodeURIComponent('/profile/reviews')}` }}
              className="flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition"
            >
              후기 작성
            </button>
          )}
        </div>
      </div>
    </>
  )
}

type Step = 'form' | 'otp' | 'result'

function OrderLookupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [guestCancelToken, setGuestCancelToken] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const doneMessage = searchParams?.get('done') === '1'

  const normalizePhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  useEffect(() => {
    const num = searchParams?.get('order_number') ?? ''
    const ph = searchParams?.get('phone') ?? ''
    if (num) setOrderNumber(num)
    if (ph) setPhone(normalizePhoneInput(ph))
  }, [searchParams])

  // 회원은 /order-lookup 대신 /orders로 이동
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/orders')
    }
  }, [authLoading, user, router])

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
    const ph = phone.replace(/\D/g, '').trim()
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
      setGuestCancelToken(data.guestCancelToken ?? null)
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
    setOrder(null)
    setGuestCancelToken(null)
  }

  const handleBackToOtp = () => {
    setStep('otp')
    setOrder(null)
    setError('')
    setGuestCancelToken(null)
  }

  const handleGuestCancelOrder = async () => {
    if (!order || !guestCancelToken || cancelling) return
    const refundAmount = formatPrice(order.total_amount)
    const confirmMessage =
      `주문을 취소하시겠습니까?\n\n` +
      `환불 예정 금액: ${refundAmount}원\n` +
      `환불은 영업일 기준 3-5일이 소요될 수 있습니다.\n\n` +
      `※ 주문 취소 시 사용한 쿠폰은 복구되지 않습니다.`
    if (!confirm(confirmMessage)) return
    setCancelling(true)
    setError('')
    try {
      const res = await fetch('/api/orders/lookup/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, token: guestCancelToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '주문 취소에 실패했습니다.')
        return
      }
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
      toast.success('주문이 취소되었습니다.\n환불은 영업일 기준 3-5일이 소요됩니다.', {
        duration: 3000,
      })
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center justify-between">
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
          <Link
            href="/"
            aria-label="홈으로"
            className="p-2 text-gray-700 hover:text-gray-900 flex-shrink-0"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:pb-6">
        <h2 className="hidden lg:block text-3xl font-bold text-center mb-8 text-primary-900 lg:mt-10">주문조회</h2>
        {doneMessage && step === 'form' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 w-full lg:max-w-sm lg:mx-auto">
            주문이 완료되었습니다. 아래에서 주문번호와 휴대폰 번호로 인증 후 조회하세요.
          </div>
        )}

        {step === 'form' && (
          <>
            <p className="text-sm lg:text-base text-gray-600 mb-4 text-center lg:mb-6">
              주문 시 입력한 <strong>주문번호</strong>와 <strong>휴대폰 번호</strong>를 입력한 뒤,
              <br />
              본인 인증 후 주문 내역을 조회할 수 있습니다.
            </p>
            <form onSubmit={handleSendOtp} className="space-y-4 mb-8 flex flex-col items-center">
              <div className="w-full lg:max-w-sm flex flex-col items-center">
                <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1 w-full text-left">
                  주문번호
                </label>
                <input
                  id="order_number"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="예: 20250303-ABCD"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  autoComplete="off"
                />
              </div>
              <div className="w-full lg:max-w-sm flex flex-col items-center">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1 w-full text-left">
                  휴대폰 번호
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                  placeholder="휴대폰 번호를 입력해주세요."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                  autoComplete="tel"
                  maxLength={13}
                />
              </div>
              {error && <p className="text-sm text-red-600 w-full lg:max-w-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full lg:max-w-sm bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 disabled:opacity-50 transition"
              >
                {loading ? '인증번호 발송 중...' : '인증번호 받기'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700 w-full lg:max-w-sm mx-auto">
              <p className="font-medium">{phone}</p>
              <p>위 번호로 발송된 6자리 인증번호를 입력해주세요.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4 mb-8 flex flex-col items-center">
              <div className="w-full lg:max-w-sm flex flex-col items-center">
                <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700 mb-1 w-full text-left">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                />
              </div>
              {error && <p className="text-sm text-red-600 w-full lg:max-w-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full lg:max-w-sm bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-950 disabled:opacity-50 transition"
              >
                {loading ? '확인 중...' : '인증하기'}
              </button>
            </form>
          </>
        )}

        {step === 'result' && order && (
          <OrderLookupResult
            order={order}
            onCancel={handleGuestCancelOrder}
            cancelling={cancelling}
          />
        )}
      </main>

      <div className="lg:mt-16">
        <Footer />
      </div>
      <div className="lg:hidden">
        <BottomNavbar />
      </div>
    </div>
  )
}

export default function OrderLookupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-white">
        <div className="hidden lg:block">
          <Header showCartButton />
        </div>
        <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문조회</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-800 border-t-transparent" />
        </main>
        <div className="lg:mt-16">
          <Footer />
        </div>
        <div className="lg:hidden">
          <BottomNavbar />
        </div>
      </div>
    }>
      <OrderLookupContent />
    </Suspense>
  )
}
