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

function OrderLookupResult({ order }: { order: OrderWithItems }) {
  const [expanded, setExpanded] = useState(true)

  const handleTrackDelivery = () => {
    if (!order.tracking_number) return
    window.open(getTrackingUrl(order.tracking_number, order.tracking_company), '_blank')
  }

  const statusText = getStatusText(order.status, order.delivery_type)
  const statusColorClass = getStatusTextColor(order.status)
  const shippingDisplay = order.gift_token ? '선물하기 주문' : (order.shipping_address || '-')

  return (
    <>
      {/* PC: 테이블 레이아웃 */}
      <div className="hidden lg:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <p className="text-base text-gray-600">
            주문번호: <span className="font-mono font-semibold text-gray-900">{order.order_number || '-'}</span>
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            주문일시: {new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
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
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
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
                      <button
                        type="button"
                        className="mt-1 text-sm text-gray-600 hover:text-red-600 underline"
                        onClick={() => {}}
                      >
                        주문취소
                      </button>
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

      {/* 모바일: 기존 카드 레이아웃 */}
      <div className="lg:hidden bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-white px-4 py-3 border-b">
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
                <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-gray-200">
                  {order.order_items[0].product?.image_url && (
                    <img
                      src={order.order_items[0].product.image_url}
                      alt={order.order_items[0].product?.name || ''}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                </div>
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
                    <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-gray-200">
                      {item.product?.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product?.name || ''}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      )}
                    </div>
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
              className="w-full py-2 text-sm text-primary-800 font-medium hover:bg-white rounded transition"
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
            {order.status === 'cancelled' && (
              <div className="text-sm pt-2 border-t">
                <span className="text-gray-600">취소·환불</span>
              </div>
            )}
          </div>
        )}

        {expanded && (
        <div className="border-t mt-3 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900">총 결제금액</span>
            <span className="text-xl font-bold text-primary-900">{formatPrice(order.total_amount)}원</span>
          </div>
        </div>
        )}

        {/* 버튼 영역 - 자세히 보기 아래 항상 표시 */}
        <div className="border-t mt-3 pt-3 flex flex-wrap gap-2">
          {order.tracking_number && (order.status === 'IN_TRANSIT' || order.status === 'DELIVERED') && (
            <button
              type="button"
              onClick={handleTrackDelivery}
              className="flex-1 min-w-[120px] bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              배송조회
            </button>
          )}
          {order.status === 'ORDER_RECEIVED' && (
            <button
              type="button"
              onClick={() => window.location.href = `/auth/login?next=${encodeURIComponent('/orders')}`}
              className="flex-1 min-w-[120px] bg-white border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition"
            >
              주문취소
            </button>
          )}
          {order.status === 'DELIVERED' && (
            <button
              type="button"
              onClick={() => window.location.href = `/auth/login?next=${encodeURIComponent('/orders')}`}
              className="flex-1 min-w-[120px] bg-white border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
            >
              구매확정
            </button>
          )}
          {order.status === 'CONFIRMED' && (
            <button
              type="button"
              onClick={() => window.location.href = `/auth/login?next=${encodeURIComponent('/profile/reviews')}`}
              className="flex-1 min-w-[120px] bg-white border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
            >
              리뷰 작성하기
            </button>
          )}
        </div>
      </div>
    </div>
    </>
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

        {step === 'result' && order && <OrderLookupResult order={order} />}
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
