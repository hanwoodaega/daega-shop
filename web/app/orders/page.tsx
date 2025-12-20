'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import OrderItemSkeleton from '@/components/skeletons/OrderItemSkeleton'
import { useAuth } from '@/lib/auth-context'
import { Order } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/format-phone'
import { getStatusText, getDeliveryTypeText, getStatusColor, getStatusTextColor, getRefundStatusText } from '@/lib/order-utils'
import { showError, showSuccess, handleSupabaseError } from '@/lib/error-handler'
import { useCartStore } from '@/lib/store'

interface OrderWithItems extends Order {
  order_items?: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
    product?: {
      name: string
      image_url: string | null
    }
  }>
  is_confirmed?: boolean  // 구매확정 여부
  gift_token?: string | null
  gift_card_design?: string | null
  gift_message?: string | null
  tracking_number?: string | null
  tracking_company?: string | null
  refund_status?: 'pending' | 'processing' | 'completed' | null
}

function OrdersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [giftToken, setGiftToken] = useState<string | null>(null)
  const [giftOrder, setGiftOrder] = useState<OrderWithItems | null>(null)
  const [copied, setCopied] = useState(false)

  // 카카오톡 SDK 로드
  useEffect(() => {
    if (typeof window === 'undefined' || window.Kakao) return

    const script = document.createElement('script')
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
    script.async = true
    script.onload = () => {
      const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
      if (kakaoAppKey && window.Kakao && !window.Kakao.isInitialized()) {
        try {
          window.Kakao.init(kakaoAppKey)
        } catch (error) {
          // SDK 초기화 실패 (조용히 처리)
        }
      }
    }
    script.onerror = () => {
      // SDK 로드 실패 (조용히 처리)
    }
    document.head.appendChild(script)

    return () => {
      // cleanup은 하지 않음 (다른 페이지에서도 사용 가능)
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/orders')
    }
  }, [user, loading, router])

  useEffect(() => {
    const token = searchParams?.get('giftToken')
    if (token) {
      setGiftToken(token)
    }
  }, [searchParams])

  useEffect(() => {
    // giftToken이 있고 orders가 로드되면 해당 주문 찾기
    if (giftToken && orders.length > 0) {
      const order = orders.find(o => o.gift_token === giftToken)
      if (order) {
        setGiftOrder(order)
      }
    }
  }, [giftToken, orders])

  useEffect(() => {
    if (user?.id) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // user 객체가 아닌 user.id만 의존

  const fetchOrders = async () => {
    if (!user?.id) return
    
    try {
      // 서버 API로 주문 목록 조회 (구매확정 여부 포함)
      const res = await fetch('/api/orders')
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '주문 조회에 실패했습니다.')
      }
      
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (error) {
      showError(error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    if (!confirm(`주문을 취소하시겠습니까?\n\n환불 예정 금액: ${formatPrice(order.total_amount)}원\n환불은 영업일 기준 3-5일 소요됩니다.`)) {
      return
    }

    setCancelingOrderId(orderId)
    try {
      // 주문 취소 API 호출 (포인트 환불 포함)
      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '주문 취소에 실패했습니다.')
      }

      // 주문 목록 업데이트
      setOrders(orders.map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              status: 'cancelled',
              refund_status: 'pending',
              refund_amount: order.total_amount,
              refund_requested_at: new Date().toISOString()
            } 
          : o
      ))

      showSuccess('주문이 취소되었습니다.\n환불이 진행됩니다. 영업일 기준 3-5일 소요됩니다.', {
        duration: 5000,
      })
    } catch (error) {
      showError(error)
    } finally {
      setCancelingOrderId(null)
    }
  }

  const handleTrackDelivery = (order: OrderWithItems) => {
    if (!order.tracking_number) {
      toast.error('송장번호가 없습니다.')
      return
    }

    // 롯데택배 배송조회 링크
    const trackingNumber = order.tracking_number
    const trackingUrl = `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${trackingNumber}`

    // 새 창에서 배송조회 링크 열기
    window.open(trackingUrl, '_blank')
  }

  const handleConfirmPurchase = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    // 적립될 포인트 계산
    // order.total_amount는 이미 최종 결제 금액(상품금액 - 할인 - 쿠폰 - 포인트)입니다.
    const finalAmount = order.total_amount
    const pointsToEarn = Math.floor(Math.max(0, finalAmount) * 0.01)

    const confirmMessage = pointsToEarn > 0
      ? `구매확정하시겠습니까?\n\n구매확정 시 ${pointsToEarn.toLocaleString()}포인트가 적립되며, 이후 교환/반품/환불은 불가합니다.`
      : '구매확정하시겠습니까?\n\n구매확정 시 이후 교환/반품/환불은 불가합니다.'

    if (!confirm(confirmMessage)) {
      return
    }

    setConfirmingOrderId(orderId)
    try {
      const response = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '구매확정에 실패했습니다.')
      }

      showSuccess(
        data.pointsEarned > 0
          ? `구매확정이 완료되었습니다.\n${data.pointsEarned.toLocaleString()}포인트가 적립되었습니다.`
          : '구매확정이 완료되었습니다.',
        {
          duration: 5000,
        }
      )

      // 즉시 로컬 상태 업데이트 (구매확정 버튼 제거)
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, is_confirmed: true }
            : order
        )
      )

      // 주문 목록 새로고침 (약간의 지연 후 - point_history가 DB에 반영될 시간을 줌)
      setTimeout(async () => {
        try {
          const res = await fetch('/api/orders')
          if (res.ok) {
            const data = await res.json()
            // 서버 데이터와 로컬 상태 병합 (구매확정 상태는 로컬 상태 우선)
            setOrders(prevOrders => {
              const serverOrdersMap = new Map<string, OrderWithItems>(
                (data.orders || []).map((order: OrderWithItems) => [order.id, order])
              )
              return prevOrders.map(order => {
                const serverOrder = serverOrdersMap.get(order.id)
                if (serverOrder) {
                  // 구매확정한 주문은 로컬 상태의 is_confirmed를 유지
                  return {
                    ...serverOrder,
                    is_confirmed: order.is_confirmed ?? serverOrder.is_confirmed,
                  } as OrderWithItems
                }
                return order
              })
            })
          }
        } catch (err) {
          console.error('주문 목록 새로고침 실패:', err)
          // 실패해도 로컬 상태는 이미 업데이트되었으므로 무시
        }
      }, 1000) // 1초 지연
    } catch (error: any) {
      showError(error)
    } finally {
      setConfirmingOrderId(null)
    }
  }

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문내역</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          {/* 왼쪽: 뒤로가기 */}
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">
              주문내역
            </h1>
          </div>
          
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-24">

        {/* 선물 링크 표시 */}
        {giftToken && (
          <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-2">선물 링크가 생성되었습니다!</h3>
                <p className="text-sm text-gray-600 mb-3">
                  아래 링크를 카카오톡으로 보내면 받는 분이 주소를 입력할 수 있습니다.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/gift/receive/${giftToken}`}
                    className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={async () => {
                      const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
                      
                      // 모바일 및 다양한 환경에서 작동하는 복사 함수
                      const copyToClipboard = async (text: string): Promise<boolean> => {
                        // 1. 최신 Clipboard API 시도
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          try {
                            await navigator.clipboard.writeText(text)
                            return true
                          } catch (err) {
                            // Clipboard API 실패 시 다음 방법 시도
                          }
                        }
                        
                        // 2. execCommand 방법 (구형 브라우저 및 모바일 대체)
                        try {
                          const textArea = document.createElement('textarea')
                          textArea.value = text
                          textArea.style.position = 'fixed'
                          textArea.style.left = '-999999px'
                          textArea.style.top = '-999999px'
                          document.body.appendChild(textArea)
                          textArea.focus()
                          textArea.select()
                          
                          const successful = document.execCommand('copy')
                          document.body.removeChild(textArea)
                          
                          if (successful) {
                            return true
                          }
                        } catch (err) {
                          // execCommand도 실패
                        }
                        
                        return false
                      }
                      
                      try {
                        const success = await copyToClipboard(giftLink)
                        if (success) {
                          setCopied(true)
                          showSuccess('링크가 복사되었습니다!', { icon: '📋' })
                          setTimeout(() => setCopied(false), 2000)
                        } else {
                          // 복사 실패 시 링크를 표시하고 수동 복사 유도
                          toast.error('자동 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
                            icon: '📋',
                            duration: 5000,
                          })
                        }
                      } catch (error) {
                        toast.error('링크 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
                          icon: '📋',
                          duration: 5000,
                        })
                      }
                    }}
                    className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition text-sm font-medium whitespace-nowrap flex-shrink-0"
                  >
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={async () => {
                      const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
                      
                      // 선물 카드 이미지 생성 함수
                      const createGiftCardImage = async (cardDesign: string | null | undefined, message: string | null | undefined): Promise<string> => {
                        return new Promise((resolve, reject) => {
                          const canvas = document.createElement('canvas')
                          const ctx = canvas.getContext('2d')
                          if (!ctx) {
                            reject(new Error('Canvas context를 가져올 수 없습니다.'))
                            return
                          }

                          const size = 1080
                          canvas.width = size
                          canvas.height = size

                          const cardImage = new Image()
                          cardImage.crossOrigin = 'anonymous'
                          
                          cardImage.onload = () => {
                            ctx.drawImage(cardImage, 0, 0, size, size)

                            if (message) {
                              const getMessageStyle = (design: string | null | undefined) => {
                                const styles: Record<string, {
                                  fontSize: number;
                                  color: string;
                                  fontFamily: string;
                                  fontWeight: string;
                                  lineHeight: number;
                                }> = {
                                  'birthday-1': {
                                    fontSize: 46, // 크게
                                    color: '#000000',
                                    fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                    fontWeight: '500',
                                    lineHeight: 1.6,
                                  },
                                  'thanks-1': {
                                    fontSize: 46, // 카톡 이미지용으로 크게
                                    color: '#000000',
                                    fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                    fontWeight: '500',
                                    lineHeight: 1.7, // 위아래 간격 조금 좁힘
                                  },
                                  'thanks-2': {
                                    fontSize: 42, // 크게
                                    color: '#000000',
                                    fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                    fontWeight: '500',
                                    lineHeight: 1.7,
                                  },
                                  'celebration-1': {
                                    fontSize: 50, // 조금 더 크게
                                    color: '#000000',
                                    fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                    fontWeight: '500',
                                    lineHeight: 1.5,
                                  },
                                  'celebration-2': {
                                    fontSize: 48, // 더 크게
                                    color: '#000000',
                                    fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                    fontWeight: '500',
                                    lineHeight: 1.4, // 위아래 간격 줄임
                                  },
                                }
                                return styles[design || ''] || {
                                  fontSize: 34,
                                  color: '#000000',
                                  fontFamily: 'S-CoreDream, S-Core Dream, Noto Sans KR, sans-serif',
                                  fontWeight: '500',
                                  lineHeight: 1.7,
                                }
                              }

                              const messageStyle = getMessageStyle(cardDesign)
                              
                              // celebration-2는 왼쪽 정렬
                              const isCelebration2 = cardDesign === 'celebration-2'
                              const textAreaTop = isCelebration2 ? size * 0.39 : size * 0.37 // celebration-2는 아주 조금 더 아래로
                              
                              ctx.fillStyle = messageStyle.color
                              ctx.font = `${messageStyle.fontWeight} ${messageStyle.fontSize}px ${messageStyle.fontFamily}`
                              ctx.textAlign = 'left'
                              ctx.textBaseline = 'top'
                              const textAreaHeight = size * 0.5
                              // thanks-1, thanks-2, celebration-1, celebration-2, birthday-1 카드는 좌우 패딩을 더 넓게
                              let leftPadding: number
                              let rightPadding: number
                              if (cardDesign === 'thanks-2') {
                                leftPadding = size * 0.18
                                rightPadding = size * 0.15 // 오른쪽 패딩 조금 줄임
                              } else if (cardDesign === 'thanks-1' || cardDesign === 'celebration-1') {
                                leftPadding = size * 0.15
                                rightPadding = size * 0.15
                              } else if (cardDesign === 'birthday-1') {
                                leftPadding = size * 0.12 // 좌우 패딩 넓게
                                rightPadding = size * 0.12
                              } else if (isCelebration2) {
                                leftPadding = size * 0.14 // 좌우 패딩 아주 조금 줄임
                                rightPadding = size * 0.14
                              } else {
                                leftPadding = size * 0.1
                                rightPadding = size * 0.1
                              }
                              const maxWidth = size - leftPadding - rightPadding

                              const lines: string[] = []
                              
                              // 먼저 줄바꿈으로 분할하여 각 줄을 개별 처리
                              const messageLines = message.split('\n')
                              
                              for (const messageLine of messageLines) {
                                // 빈 줄인 경우 빈 문자열 추가 (한 줄 띄기)
                                if (!messageLine.trim()) {
                                  lines.push('')
                                  continue
                                }
                                
                                // 각 줄을 단어 단위로 분할하여 처리
                                let currentLine = ''
                                const words = messageLine.split(/(\s+)/)
                                
                                for (const word of words) {
                                  if (!word.trim()) {
                                    // 공백만 있는 경우 현재 라인에 추가
                                    if (currentLine) {
                                      currentLine += word
                                    }
                                    continue
                                  }
                                  
                                  // 단어나 문자 단위로 테스트
                                  const testLine = currentLine ? `${currentLine}${word}` : word
                                  const metrics = ctx.measureText(testLine)
                                  
                                  if (metrics.width > maxWidth) {
                                    if (currentLine) {
                                      // 현재 라인 저장
                                      lines.push(currentLine.trim())
                                      currentLine = word
                                    } else {
                                      // 한 단어가 너무 길면 문자 단위로 분할 (한글 대응)
                                      let charLine = ''
                                      for (const char of word) {
                                        const testCharLine = charLine + char
                                        const charMetrics = ctx.measureText(testCharLine)
                                        if (charMetrics.width > maxWidth && charLine) {
                                          lines.push(charLine)
                                          charLine = char
                                        } else {
                                          charLine = testCharLine
                                        }
                                      }
                                      if (charLine) {
                                        currentLine = charLine
                                      }
                                    }
                                  } else {
                                    currentLine = testLine
                                  }
                                }
                                
                                // 마지막 라인 추가
                                if (currentLine.trim()) {
                                  lines.push(currentLine.trim())
                                }
                              }

                              const lineHeight = messageStyle.fontSize * messageStyle.lineHeight
                              lines.forEach((line, index) => {
                                const y = textAreaTop + (index * lineHeight)
                                ctx.fillText(line, leftPadding, y)
                              })
                            }

                            const dataUrl = canvas.toDataURL('image/png')
                            resolve(dataUrl)
                          }

                          cardImage.onerror = () => {
                            reject(new Error('카드 이미지를 로드할 수 없습니다.'))
                          }

                          const cardImageUrl = cardDesign 
                            ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                            : `${window.location.origin}/images/gift-default.jpg`
                          
                          cardImage.src = cardImageUrl
                        })
                      }

                      try {
                        // 모바일 환경 확인
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                        
                        // PC 환경에서는 링크 복사
                        if (!isMobile) {
                          const copySuccess = await navigator.clipboard.writeText(giftLink).then(() => true).catch(() => false)
                          if (copySuccess) {
                            toast.success(
                              'PC에서는 카카오톡 공유가 불가능합니다.\n선물 링크가 클립보드에 복사되었습니다.\n모바일로 링크를 보내거나, 모바일에서 다시 시도해주세요.',
                              {
                                icon: '📱',
                                duration: 8000,
                              }
                            )
                          } else {
                            toast.error('링크 복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.', {
                              icon: '📋',
                              duration: 5000,
                            })
                          }
                          return
                        }

                        // 카카오톡 SDK 확인 및 초기화
                        if (!window.Kakao) {
                          throw new Error('카카오톡 SDK가 로드되지 않았습니다.')
                        }

                        if (!window.Kakao.isInitialized()) {
                          const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || ''
                          if (!kakaoAppKey) {
                            throw new Error('카카오톡 앱 키가 설정되지 않았습니다.')
                          }
                          window.Kakao.init(kakaoAppKey)
                          await new Promise(resolve => setTimeout(resolve, 200))
                          
                          if (!window.Kakao.isInitialized()) {
                            throw new Error('카카오톡 SDK 초기화에 실패했습니다.')
                          }
                        }

                        if (!window.Kakao.Share) {
                          throw new Error('카카오톡 Share API를 사용할 수 없습니다.')
                        }

                        // 선물 카드 디자인과 메시지 가져오기
                        const cardDesign = giftOrder?.gift_card_design || null
                        const giftMessage = giftOrder?.gift_message || null

                        // 카드 디자인별 제목 설정
                        const getCardTitle = (design: string | null | undefined) => {
                          if (design?.startsWith('birthday')) {
                            return '🎂 생일 축하 선물이 도착했습니다!'
                          } else if (design?.startsWith('thanks')) {
                            return '🙏 감사 인사 선물이 도착했습니다!'
                          } else if (design?.startsWith('celebration')) {
                            return '🎉 축하 선물이 도착했습니다!'
                          }
                          return '🎁 선물이 도착했습니다!'
                        }

                        const title = getCardTitle(cardDesign)

                        // 메시지가 있으면 합성 이미지 생성, 없으면 원본 이미지 사용
                        let cardImageUrl: string
                        if (giftMessage && cardDesign) {
                          try {
                            const dataUrl = await createGiftCardImage(cardDesign, giftMessage)
                            
                            // 서버에 업로드하여 공개 URL 생성
                            try {
                              const uploadResponse = await fetch('/api/gift/upload-card-image', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ imageData: dataUrl }),
                              })
                              
                              if (uploadResponse.ok) {
                                const uploadData = await uploadResponse.json()
                                cardImageUrl = uploadData.url
                              } else {
                                cardImageUrl = cardDesign 
                                  ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                                  : `${window.location.origin}/images/gift-default.jpg`
                              }
                            } catch (uploadError) {
                              cardImageUrl = cardDesign 
                                ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                                : `${window.location.origin}/images/gift-default.jpg`
                            }
                          } catch (imageError) {
                            // 이미지 생성 실패 시 원본 이미지 사용
                            console.error('이미지 생성 실패:', imageError)
                            cardImageUrl = cardDesign 
                              ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                              : `${window.location.origin}/images/gift-default.jpg`
                          }
                        } else {
                          cardImageUrl = cardDesign 
                            ? `${window.location.origin}/images/gift-cards/${cardDesign}.png`
                            : `${window.location.origin}/images/gift-default.jpg`
                        }

                        // 카카오톡 공유 실행
                        window.Kakao.Share.sendDefault({
                          objectType: 'feed',
                          content: {
                            title: title,
                            description: giftMessage || '선물을 받아보세요!',
                            imageUrl: cardImageUrl,
                            link: {
                              mobileWebUrl: giftLink,
                              webUrl: giftLink,
                            },
                          },
                          buttons: [
                            {
                              title: '선물 받기',
                              link: {
                                mobileWebUrl: giftLink,
                                webUrl: giftLink,
                              },
                            },
                          ],
                        })
                      } catch (error: any) {
                        // 카카오톡 공유 실패 시 링크 복사로 대체
                        try {
                          const giftLink = `${window.location.origin}/gift/receive/${giftToken}`
                          await navigator.clipboard.writeText(giftLink)
                          toast.success(
                            '카카오톡 공유에 실패했습니다. 선물 링크가 클립보드에 복사되었습니다.\n링크를 카카오톡으로 직접 보내주세요.',
                            {
                              icon: '📋',
                              duration: 8000,
                            }
                          )
                        } catch (clipboardError) {
                          toast.error(
                            `카카오톡 공유에 실패했습니다. 아래 링크를 복사해서 보내주세요:\n${giftLink}`,
                            {
                              icon: '❌',
                              duration: 10000,
                            }
                          )
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-yellow-300 text-gray-900 rounded-lg hover:bg-yellow-400 transition text-sm font-medium"
                  >
                    카카오톡으로 보내기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주문 목록 */}
        {loadingOrders ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32 md:py-40">
            <p className="text-xl text-gray-600 mb-6">주문 내역이 없습니다.</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              쇼핑 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 주문 헤더 */}
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

                {/* 주문 상품 목록 */}
                <div className="p-4">
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mb-4">
                      {/* 첫 번째 상품만 표시 */}
                      {!expandedOrders.has(order.id) ? (
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {order.order_items[0].product?.name || '상품'}
                              {order.order_items.length > 1 && (
                                <span className="text-gray-500 ml-1">
                                  외 {order.order_items.length - 1}개 상품
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatPrice(order.order_items[0].price)}원 × {order.order_items[0].quantity}개
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* 모든 상품 표시 */
                        <div className="space-y-3 mb-3">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3">
                              <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {item.product?.name || '상품'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatPrice(item.price)}원 × {item.quantity}개
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 자세히 보기 버튼 */}
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="w-full py-2 text-sm text-primary-800 font-medium hover:bg-gray-50 rounded transition"
                      >
                        {expandedOrders.has(order.id) ? '접기 ▲' : '자세히 보기 ▼'}
                      </button>
                    </div>
                  )}

                  {/* 주문 정보 - 펼쳤을 때만 표시 */}
                  {expandedOrders.has(order.id) && (
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
                      {/* 선물 주문인 경우 배송 정보 대신 상태 메시지 표시 */}
                      {order.gift_token ? (
                        <div className="text-sm pt-2">
                          <span className="text-gray-900 font-medium">
                            {order.status === 'DELIVERED'
                              ? '선물이 전달되었습니다.' 
                              : '선물 받은 분에게 선물을 전달 중입니다.'}
                          </span>
                        </div>
                      ) : (
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
                      
                      {/* 환불 정보 */}
                      {order.refund_status && (
                        <div className="text-sm pt-2 border-t">
                          <span className="text-gray-600">환불 상태: </span>
                          <span className={`font-medium ${
                            order.refund_status === 'completed' ? 'text-green-600' :
                            order.refund_status === 'processing' ? 'text-blue-600' :
                            'text-orange-600'
                          }`}>
                            {getRefundStatusText(order.refund_status)}
                          </span>
                        </div>
                      )}
                      {order.refund_amount && (
                        <div className="text-sm">
                          <span className="text-gray-600">환불 금액: </span>
                          <span className="text-red-600 font-semibold">{formatPrice(order.refund_amount)}원</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 결제 금액 */}
                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-semibold text-gray-900">총 결제금액</span>
                      <span className="text-xl font-bold text-primary-900">
                        {formatPrice(order.total_amount)}원
                      </span>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex gap-2">
                      {/* 배송조회 버튼 - 송장번호가 있고 배송 중이거나 배송 완료일 때만 표시 */}
                      {order.tracking_number && (
                        (order.status === 'IN_TRANSIT' ||
                         order.status === 'DELIVERED') && (
                          <button
                            onClick={() => handleTrackDelivery(order)}
                            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                          >
                            배송조회
                          </button>
                        )
                      )}
                      
                      {/* 구매확정 버튼 - 배송완료 상태이고 아직 구매확정하지 않은 경우만 표시 */}
                      {order.status === 'DELIVERED' && !order.is_confirmed && (
                        <button
                          onClick={() => handleConfirmPurchase(order.id)}
                          disabled={confirmingOrderId === order.id}
                          className="flex-1 bg-white text-red-600 border border-red-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          {confirmingOrderId === order.id ? '처리 중...' : '구매확정'}
                        </button>
                      )}
                      
                      {/* 구매확정 완료 후: 리뷰 작성 유도 버튼 */}
                      {order.status === 'DELIVERED' && order.is_confirmed && (
                        <button
                          onClick={() => router.push('/profile/reviews')}
                          className="flex-1 bg-white border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                        >
                          리뷰 작성하기
                        </button>
                      )}
                      
                      {/* 주문취소 버튼 - 주문완료 상태일 때만 표시 */}
                      {order.status === 'ORDER_RECEIVED' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelingOrderId === order.id}
                          className="flex-1 bg-white border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {cancelingOrderId === order.id ? '취소 중...' : '주문취소'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <BottomNavbar />
    </div>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">주문내역</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-4 pb-24">
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderItemSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  )
}

