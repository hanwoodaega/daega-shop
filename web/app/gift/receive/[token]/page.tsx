'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useDaumPostcode } from '@/lib/hooks/useDaumPostcode'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: {
    id: string
    name: string
    image_url: string | null
  }
}

interface Order {
  id: string
  total_amount: number
  gift_message: string | null
  gift_card_design: string | null
  order_items: OrderItem[]
  created_at: string
  gift_expires_at?: string | null
}

export default function GiftReceivePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    zipcode: '',
    address: '',
    address_detail: '',
    delivery_note: '',
  })

  const { open: openPostcode } = useDaumPostcode({
    onComplete: (data) => {
      setFormData(prev => ({
        ...prev,
        zipcode: data.zonecode,
        address: data.address,
      }))
    },
  })

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다.')
      setLoading(false)
      return
    }

    fetchOrder()
  }, [token])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/gift/${token}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 410 || data.expired) {
          setIsExpired(true)
          setExpiresAt(data.expires_at || null)
        }
        setError(data.error || '선물 정보를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      setOrder(data.order)
      setExpiresAt(data.expires_at || null)
      
      // 만료일 체크
      if (data.expires_at) {
        const expires = new Date(data.expires_at)
        if (expires < new Date()) {
          setIsExpired(true)
        }
      }
    } catch (error) {
      console.error('주문 조회 실패:', error)
      setError('선물 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/[^0-9]/g, '')
    setFormData(prev => ({ ...prev, recipient_phone: numbers }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.recipient_name || !formData.recipient_phone || !formData.address) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/gift/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          zipcode: formData.zipcode,
          address: formData.address,
          address_detail: formData.address_detail,
          delivery_note: formData.delivery_note,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '주소 등록에 실패했습니다.')
        setSubmitting(false)
        return
      }

      // 성공 시 주문 완료 페이지로 이동
      router.push(`/orders?success=gift&orderId=${data.order.id}`)
    } catch (error) {
      console.error('주소 등록 실패:', error)
      setError('주소 등록 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-100 rounded-lg"></div>
              <div className="h-96 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-lg p-6 text-center ${
              isExpired 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className={`text-lg font-semibold mb-2 ${
                isExpired ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {isExpired ? '⏰ 선물 링크가 만료되었습니다' : '⚠️'}
              </p>
              <p className={isExpired ? 'text-red-700' : 'text-yellow-700'}>
                {error}
              </p>
              {isExpired && expiresAt && (
                <p className="text-sm text-red-600 mt-2">
                  만료일: {new Date(expiresAt).toLocaleString('ko-KR')}
                </p>
              )}
              {isExpired && (
                <p className="text-sm text-red-600 mt-4">
                  선물 링크는 7일간 유효하며, 만료된 경우 자동으로 환불 처리됩니다.
                </p>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">🎁 선물 수령하기</h1>
            <p className="text-gray-600">받으실 주소를 입력해주세요</p>
            {expiresAt && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ⏰ 선물 링크는 <strong>{new Date(expiresAt).toLocaleDateString('ko-KR')}</strong>까지 유효합니다.
                  <br />
                  <span className="text-xs">7일 이내에 주소를 입력하지 않으면 자동으로 환불 처리됩니다.</span>
                </p>
              </div>
            )}
          </div>

          {/* 선물 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">선물 정보</h2>
            
            {/* 카드 디자인 표시 */}
            {order.gift_card_design && (
              <div className="mb-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg" style={{ aspectRatio: '4/3' }}>
                  <img
                    src={`/images/gift-cards/${order.gift_card_design}.jpg`}
                    alt="선물 카드"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 이미지가 없을 경우 그라데이션 배경으로 폴백
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement!
                      const gradient = order.gift_card_design === 'birthday' 
                        ? 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
                        : order.gift_card_design === 'anniversary'
                        ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
                        : order.gift_card_design === 'thanks'
                        ? 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
                        : 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)'
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center" style="background: ${gradient}">
                          <div class="text-center p-6">
                            <div class="text-4xl mb-2">
                              ${order.gift_card_design === 'birthday' ? '🎂' : order.gift_card_design === 'anniversary' ? '💝' : order.gift_card_design === 'thanks' ? '🙏' : '🎁'}
                            </div>
                            <p class="text-lg font-bold text-gray-800 mb-2">
                              ${order.gift_card_design === 'birthday' ? '생일 축하' : order.gift_card_design === 'anniversary' ? '기념일' : order.gift_card_design === 'thanks' ? '감사 인사' : '특별한 선물'}
                            </p>
                          </div>
                        </div>
                      `
                    }}
                  />
                  {/* 메시지 오버레이 */}
                  {order.gift_message && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="bg-white bg-opacity-90 rounded-lg p-4 max-w-full max-h-full overflow-auto shadow-lg">
                        <p className="text-gray-800 text-center whitespace-pre-wrap break-words" style={{ 
                          fontSize: 'clamp(14px, 2.5vw, 18px)',
                          lineHeight: '1.6'
                        }}>
                          {order.gift_message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {order.gift_message && !order.gift_card_design && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">선물 메시지</p>
                <p className="text-gray-900">{order.gift_message}</p>
              </div>
            )}

            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.products.image_url && (
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.products.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity}개 × {formatPrice(item.price)}원
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(item.quantity * item.price)}원
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">총 금액</span>
                <span className="text-xl font-bold text-primary-900">
                  {formatPrice(order.total_amount)}원
                </span>
              </div>
            </div>
          </div>

          {/* 주소 입력 폼 */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">배송 정보</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  받는 분 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="recipient_name"
                  value={formData.recipient_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="recipient_phone"
                  value={formData.recipient_phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="01012345678"
                  maxLength={11}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  우편번호
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="우편번호"
                  />
                  <button
                    type="button"
                    onClick={openPostcode}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
                  >
                    주소찾기
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  readOnly
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="주소찾기 버튼을 클릭하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  상세 주소
                </label>
                <input
                  type="text"
                  name="address_detail"
                  value={formData.address_detail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="101동 101호"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  배송 요청사항
                </label>
                <textarea
                  name="delivery_note"
                  value={formData.delivery_note}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="예: 공동현관 비밀번호 #1234, 문 앞에 놓아주세요"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-3 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '처리 중...' : '주소 등록하기'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

