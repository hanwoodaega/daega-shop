'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavbar from '@/components/BottomNavbar'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'

interface PaymentCard {
  id: string
  user_id: string
  card_number: string
  card_holder: string
  expiry_month: string
  expiry_year: string
  is_default: boolean
  created_at: string
}

export default function PaymentPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  const [cards, setCards] = useState<PaymentCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    card_number: '',
    card_holder: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    is_default: false,
  })

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
      const { data, error } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setCards(data || [])
    } catch (error) {
      console.error('카드 조회 실패:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 카드 번호 마스킹 (마지막 4자리만 저장)
      const last4 = formData.card_number.slice(-4)
      const maskedCardNumber = `****-****-****-${last4}`

      // 기본 카드로 설정하는 경우, 기존 기본 카드 해제
      if (formData.is_default) {
        await supabase
          .from('payment_cards')
          .update({ is_default: false })
          .eq('user_id', user!.id)
          .eq('is_default', true)
      }

      const { error } = await supabase
        .from('payment_cards')
        .insert({
          user_id: user!.id,
          card_number: maskedCardNumber,
          card_holder: formData.card_holder,
          expiry_month: formData.expiry_month,
          expiry_year: formData.expiry_year,
          is_default: formData.is_default,
        })

      if (error) throw error

      setShowAddModal(false)
      setFormData({
        card_number: '',
        card_holder: '',
        expiry_month: '',
        expiry_year: '',
        cvv: '',
        is_default: false,
      })
      fetchCards()
    } catch (error: any) {
      console.error('카드 등록 실패:', error)
      alert('카드 등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('카드를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('payment_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', user!.id)

      if (error) throw error
      fetchCards()
    } catch (error) {
      console.error('카드 삭제 실패:', error)
      alert('카드 삭제에 실패했습니다.')
    }
  }

  const handleSetDefault = async (cardId: string) => {
    try {
      // 기존 기본 카드 해제
      await supabase
        .from('payment_cards')
        .update({ is_default: false })
        .eq('user_id', user!.id)
        .eq('is_default', true)

      // 새 기본 카드 설정
      const { error } = await supabase
        .from('payment_cards')
        .update({ is_default: true })
        .eq('id', cardId)
        .eq('user_id', user!.id)

      if (error) throw error
      fetchCards()
    } catch (error) {
      console.error('기본 카드 설정 실패:', error)
      alert('기본 카드 설정에 실패했습니다.')
    }
  }

  const formatCardNumber = (cardNumber: string) => {
    // 마스킹된 카드 번호 표시
    return cardNumber.replace(/(.{4})/g, '$1 ').trim()
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
                  className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
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
          
          {/* 오른쪽: 장바구니 버튼 */}
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
                className={`absolute top-0 right-0 bg-blue-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transition ${
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

      <main className="flex-1 container mx-auto px-4 py-4 pb-24">
        {/* 카드 추가 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition"
          >
            + 카드 등록
          </button>
        </div>

        {/* 등록된 카드 목록 */}
        {cards.length === 0 ? (
          <div className="text-center py-12">
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
                      {formatCardNumber(card.card_number)}
                    </span>
                    {card.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                        기본
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-gray-400 hover:text-red-600 transition"
                    aria-label="카드 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <div>카드 소유자: {card.card_holder}</div>
                  <div>유효기간: {card.expiry_month}/{card.expiry_year}</div>
                </div>
                {!card.is_default && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    className="text-sm text-primary-800 hover:text-primary-900 font-medium"
                  >
                    기본 카드로 설정
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 카드 등록 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">카드 등록</h2>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카드 번호
                  </label>
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 16)
                      setFormData({ ...formData, card_number: numbers })
                    }}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카드 소유자
                  </label>
                  <input
                    type="text"
                    value={formData.card_holder}
                    onChange={(e) => setFormData({ ...formData, card_holder: e.target.value })}
                    placeholder="홍길동"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      월
                    </label>
                    <input
                      type="text"
                      value={formData.expiry_month}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                        setFormData({ ...formData, expiry_month: numbers })
                      }}
                      placeholder="MM"
                      maxLength={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      년
                    </label>
                    <input
                      type="text"
                      value={formData.expiry_year}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                        setFormData({ ...formData, expiry_year: numbers })
                      }}
                      placeholder="YY"
                      maxLength={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                        setFormData({ ...formData, cvv: numbers })
                      }}
                      placeholder="123"
                      maxLength={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                    기본 카드로 설정
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setFormData({
                        card_number: '',
                        card_holder: '',
                        expiry_month: '',
                        expiry_year: '',
                        cvv: '',
                        is_default: false,
                      })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary-800 text-white py-3 rounded-lg font-semibold hover:bg-primary-900 transition disabled:bg-gray-400"
                  >
                    {saving ? '등록 중...' : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <BottomNavbar />
    </div>
  )
}

