'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { useAuth } from '@/lib/auth/auth-context'
import { useCartStore } from '@/lib/store'

export default function PaymentPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  const [cards, setCards] = useState<any[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?next=/profile/payment')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.id) {
      fetchCards()
    }
  }, [user?.id])

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/payment-cards')
      if (!res.ok) {
        setCards([])
        return
      }
      const data = await res.json()
      setCards(data.cards || [])
    } catch (error) {
      setCards([])
    } finally {
      setLoadingCards(false)
    }
  }

  const handleRegisterCard = async () => {
    if (!user?.id) return

    const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!tossClientKey) {
      alert('결제 설정이 없습니다.')
      return
    }

    const tossFactory = (window as any)?.TossPayments
    if (!tossFactory) {
      alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    try {
      setRegistering(true)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const successUrl = `${baseUrl}/profile/payment/toss/success`
      const failUrl = `${baseUrl}/profile/payment/toss/fail`
      const customerKey = user.id

      const tossPayments = tossFactory(tossClientKey)
      await tossPayments.requestBillingAuth('CARD', {
        customerKey,
        successUrl,
        failUrl,
        customerName: user.user_metadata?.name || user.email || '고객',
      })
    } catch (error: any) {
      console.error('카드 등록 요청 실패:', error)
      alert(error?.message || '카드 등록 요청에 실패했습니다.')
    } finally {
      setRegistering(false)
    }
  }

  if (loading || loadingCards) {
    return (
      <div className="min-h-screen flex flex-col">
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
              <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">간편 결제 관리</h1>
            </div>
            <div className="ml-auto flex items-center">
              <button
                onClick={() => router.push('/cart')}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="장바구니"
              >
                <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                  className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
                    cartCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                  }`}
                  suppressHydrationWarning
                  aria-hidden={cartCount <= 0}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <BottomNavbar />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Script src="https://js.tosspayments.com/v1" strategy="afterInteractive" />
      {/* 간편 결제 관리 전용 헤더 */}
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
              간편 결제 관리
            </h1>
          </div>
          
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        <div className="mb-6">
          <button
            type="button"
            onClick={handleRegisterCard}
            disabled={registering}
            className="w-full bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition disabled:bg-gray-400"
          >
            {registering ? '카드 등록 중...' : '+ 카드 등록'}
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-gray-500">등록된 카드가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {card.card_number || '**** **** **** ****'}
                    </span>
                    {card.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                        기본
                      </span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('카드를 삭제하시겠습니까?')) return
                      const res = await fetch(`/api/payment-cards/${card.id}`, { method: 'DELETE' })
                      if (res.ok) {
                        fetchCards()
                      } else {
                        alert('카드 삭제에 실패했습니다.')
                      }
                    }}
                    className="text-gray-400 hover:text-red-600 transition"
                    aria-label="카드 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {card.card_company && (
                  <div className="text-sm text-gray-600 mb-2">
                    카드사: {card.card_company}
                  </div>
                )}
                {!card.is_default && (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/payment-cards/${card.id}`, { method: 'PUT' })
                      if (res.ok) {
                        fetchCards()
                      } else {
                        alert('기본 카드 설정에 실패했습니다.')
                      }
                    }}
                    className="text-sm text-primary-800 hover:text-primary-900 font-medium"
                  >
                    기본 카드로 설정
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavbar />
    </div>
  )
}

