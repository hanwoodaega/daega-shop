'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDaumPostcode } from '@/lib/postcode/useDaumPostcode'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: {
    id: string
    name: string
    image_url?: string | null
    brand?: string | null
    weight_gram?: number | null
  }
}

interface Order {
  id: string
  total_amount: number
  gift_message: string | null
  order_items: OrderItem[]
  created_at: string
  gift_expires_at?: string | null
  shipping_address?: string | null
  status?: string
  users?: {
    name: string
    email: string
  } | null
}

export default function GiftReceiveClient() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const fetchingRef = useRef(false)
  
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

  const fetchOrder = useCallback(async () => {
    // 이미 요청 중이면 중복 요청 방지
    if (fetchingRef.current) {
      return
    }
    
    fetchingRef.current = true
    try {
      const response = await fetch(`/api/gift/${token}`)
      const data = await response.json()

      if (!response.ok) {
        // 보낸 사람이 주문 취소한 경우: "주문이 취소되었습니다." 만 표시
        if (response.status === 410 && data.cancelled) {
          setError('주문이 취소되었습니다.')
          setIsCancelled(true)
          setOrder(null)
          setLoading(false)
          return
        }
        // 만료된 선물인 경우에도 order 정보가 있으면 만료 안내 화면 표시
        if ((response.status === 410 || data.expired) && data.order) {
          setOrder(data.order)
          setExpiresAt(data.expires_at || null)
          setIsExpired(true)
          setLoading(false)
          return
        }
        setError(data.error || '선물 정보를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      if (!data.order) {
        setError('선물 정보를 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      setOrder(data.order)
      setExpiresAt(data.expires_at || null)
      
      // 이미 수령된 선물인 경우
      if (data.alreadyReceived || data.order.status === 'gift_received') {
        setError('이미 수령된 선물입니다.')
        setLoading(false)
        return
      }
      
      // 만료 상태 체크 (수령 완료가 아니고 만료일 지남)
      if (!data.order.status || data.order.status !== 'gift_received') {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsExpired(true)
        }
      }
    } catch (error) {
      console.error('주문 조회 실패:', error)
      setError('선물 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다.')
      setLoading(false)
      return
    }

    fetchOrder()
  }, [token, fetchOrder])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/[^0-9]/g, '')
    setFormData(prev => ({ ...prev, recipient_phone: numbers }))
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '')
    const len = numbers.length
    if (len <= 3) return numbers
    if (len <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // 배송정보 입력 여부 체크
  const isFormValid = () => {
    return !!(
      formData.recipient_name &&
      formData.recipient_phone &&
      formData.address
    )
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    setError(null)

    if (!isFormValid()) {
      toast.error('배송정보를 모두 입력해주세요.')
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
        // 401 에러인 경우 로그인 페이지로 리다이렉트되는 것을 방지
        if (response.status === 401) {
          setError('인증 오류가 발생했습니다. 페이지를 새로고침해주세요.')
        } else {
          setError(data.error || '주소 등록에 실패했습니다.')
        }
        setSubmitting(false)
        return
      }

      // 성공 시 성공 페이지로 이동
      router.push(`/gift/receive/${token}/success`)
    } catch (error) {
      console.error('주소 등록 실패:', error)
      setError('주소 등록 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-100 rounded-lg"></div>
              <div className="h-96 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error && !order) {
    // 주문 취소된 경우: "주문이 취소되었습니다." 만 표시
    if (isCancelled) {
      return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border-2 p-8 text-center rounded-lg" style={{ borderColor: '#D4C6A8' }}>
                <h1 className="text-lg font-bold text-gray-800 mb-4">
                  주문이 취소되었습니다.
                </h1>
                <p className="text-sm text-gray-700 leading-relaxed">
                  보내는 분에 의해 주문이 취소되어 선물을 수령할 수 없습니다.
                </p>
              </div>
            </div>
          </main>
        </div>
      )
    }
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
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
                {isExpired ? '선물 링크가 만료되었습니다' : '⚠️'}
              </p>
              <p className={isExpired ? 'text-red-600' : 'text-yellow-700'}>
                {error}
              </p>
              {isExpired && expiresAt && (
                <p className="text-sm text-red-600 mt-2">
                  만료일: {new Date(expiresAt).toLocaleString('ko-KR')}
                </p>
              )}
              {isExpired && (
                <p className="text-sm text-red-600 mt-4">
                  선물 링크는 5일간 유효하며, 만료된 경우 자동으로 환불 처리됩니다.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!order) {
    return null
  }

  // 만료된 경우 만료 안내 화면 표시
  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border-2 p-8 text-center" style={{ borderColor: '#D4C6A8' }}>
              <h1 className="text-lg font-bold text-gray-800 mb-4">
                이 선물은 유효기간이 만료되었습니다.
              </h1>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                7일 이내에 수령이 완료되지 않아 주문이 자동으로 취소되었어요.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                궁금한 점이 있으시면 고객센터로 문의해주세요.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
      {/* 상단 고정 메시지 */}
      {(order.users?.name) && (
        <div className="sticky top-0 z-30 bg-white border-b-2 py-3" style={{ borderColor: '#D4C6A8' }}>
          <div className="container mx-auto px-4 max-w-2xl">
            <p className="text-center text-gray-800 font-medium">
              <span className="font-semibold">{order.users.name}</span>님이 선물을 보냈어요!
            </p>
          </div>
        </div>
      )}
      
      <main className="flex-1 container mx-auto px-4 pt-3 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* 선물 배너 이미지 */}
          <div className="mt-0 mb-3 flex justify-center">
            <img
              src="/images/gift-banner-800x400.png"
              alt="선물 안내 배너"
              className="w-full max-w-[800px] h-auto rounded-md"
            />
          </div>

          {/* 선물 정보 */}
          <div className="bg-white shadow-md p-6 mb-6 border-2" style={{ borderColor: '#D4C6A8' }}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">선물 정보</h2>

            <div className="space-y-4">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-100"
                >
                  <div className="flex-shrink-0">
                    {item.products.image_url ? (
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-20 h-20 object-cover rounded border"
                        style={{ borderColor: '#D4C6A8' }}
                      />
                    ) : (
                      <div
                        className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center border"
                        style={{ borderColor: '#D4C6A8' }}
                      >
                        <span className="text-gray-400 text-[10px]">이미지 없음</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {item.products.brand && (
                      <p className="text-xs text-gray-600 font-semibold mb-0.5">
                        {item.products.brand}
                      </p>
                    )}
                    <p className="font-semibold text-gray-900">
                      {item.products.name} x {item.quantity}개
                    </p>
                    {item.products.weight_gram != null && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        중량: {item.products.weight_gram}g
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 이미 수령된 선물인 경우 (status === 'gift_received') */}
          {order.status === 'gift_received' ? (
            <div className="bg-white shadow-md p-6 border-2" style={{ borderColor: '#D4C6A8' }}>
              <p className="text-gray-800 text-center">이미 배송 정보가 입력되었습니다.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="bg-white shadow-md p-6 border-2" style={{ borderColor: '#D4C6A8' }}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">배송 정보</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  받는 분 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="recipient_name"
                  value={formData.recipient_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: '#D4C6A8' }}
                  placeholder="이름을 입력해주세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="recipient_phone"
                  value={formatPhone(formData.recipient_phone)}
                  onChange={handlePhoneChange}
                  required
                  placeholder="휴대폰 번호를 입력해주세요"
                  maxLength={13}
                  className="w-full px-4 py-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: '#D4C6A8' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  우편번호
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    readOnly
                    className="flex-1 min-w-0 px-4 py-2 border rounded-lg bg-gray-50 text-gray-800"
                    style={{ borderColor: '#D4C6A8' }}
                    placeholder="우편번호"
                  />
                  <button
                    type="button"
                    onClick={openPostcode}
                    className="flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap border-2"
                    style={{ backgroundColor: '#F7F3ED', color: '#8B7A5F', borderColor: '#D4C6A8' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E0D4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F7F3ED'}
                  >
                    주소찾기
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  readOnly
                  required
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-800"
                  style={{ borderColor: '#D4C6A8' }}
                  placeholder="주소찾기 버튼을 클릭하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  상세 주소
                </label>
                <input
                  type="text"
                  name="address_detail"
                  value={formData.address_detail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: '#D4C6A8' }}
                  placeholder="101동 101호"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800">
                  배송 요청사항
                </label>
                <textarea
                  name="delivery_note"
                  value={formData.delivery_note}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={50}
                  className="w-full px-4 py-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: '#D4C6A8' }}
                  placeholder="예: 공동현관 비밀번호 #1234"
                />
              </div>
            </div>
          </form>
          )}

          {/* 선물 링크 유효기간 정보 */}
          {expiresAt && !isExpired && order.status !== 'gift_received' && (
            <div className="mt-6 p-4 bg-gray-50 border-2 text-center" style={{ borderColor: '#D4C6A8' }}>
              <p className="text-sm text-gray-800">
                선물 링크는 <strong className="text-gray-800">{new Date(expiresAt).toLocaleDateString('ko-KR')}</strong>까지 유효합니다.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 하단 고정 버튼 영역 (수령 대기 상태일 때만 표시) */}
      {order && order.status !== 'gift_received' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 z-50" style={{ borderColor: '#D4C6A8' }}>
          <div className="container mx-auto px-4 py-3 max-w-2xl">
            {/* 선물 수령하기 버튼 */}
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full py-2 rounded-lg font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed border-2"
              style={{ 
                backgroundColor: !submitting ? '#F7F3ED' : '#E8E0D4', 
                color: '#8B7A5F', 
                borderColor: '#D4C6A8' 
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#E8E0D4'
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#F7F3ED'
                }
              }}
            >
              {submitting ? '처리 중...' : '선물 수령하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
