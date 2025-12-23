'use client'

import { useRouter } from 'next/navigation'

interface PaymentMethodSelectorProps {
  paymentMethod: string
  selectedCardId: string | null
  savedCards: any[]
  loadingCards: boolean
  onPaymentMethodChange: (method: string) => void
  onCardSelect: (cardId: string | null) => void
}

export default function PaymentMethodSelector({
  paymentMethod,
  selectedCardId,
  savedCards,
  loadingCards,
  onPaymentMethodChange,
  onCardSelect,
}: PaymentMethodSelectorProps) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">결제 방법</h2>
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="easy" 
            checked={paymentMethod === 'easy'}
            onChange={() => onPaymentMethodChange('easy')}
            className="w-4 h-4" 
          />
          <span>카드 간편 결제</span>
        </label>
        {paymentMethod === 'easy' && (
          <div className="ml-7 mt-2 space-y-2">
            {loadingCards ? (
              <div className="text-sm text-gray-500">카드 불러오는 중...</div>
            ) : savedCards.length === 0 ? (
              <button
                type="button"
                onClick={() => router.push('/profile/payment')}
                className="w-full px-8 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition"
              >
                카드 등록하기
              </button>
            ) : (
              savedCards.map((card) => (
                <label key={card.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="selectedCard"
                    value={card.id}
                    checked={selectedCardId === card.id}
                    onChange={() => onCardSelect(card.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{card.card_number}</span>
                    {card.is_default && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                        기본
                      </span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        )}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="card" 
            checked={paymentMethod === 'card'}
            onChange={() => onPaymentMethodChange('card')}
            className="w-4 h-4" 
          />
          <span>신용카드</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="naverpay" 
            checked={paymentMethod === 'naverpay'}
            onChange={() => onPaymentMethodChange('naverpay')}
            className="w-4 h-4" 
          />
          <span>네이버 페이</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="kakaopay" 
            checked={paymentMethod === 'kakaopay'}
            onChange={() => onPaymentMethodChange('kakaopay')}
            className="w-4 h-4" 
          />
          <span>카카오페이</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="tosspay" 
            checked={paymentMethod === 'tosspay'}
            onChange={() => onPaymentMethodChange('tosspay')}
            className="w-4 h-4" 
          />
          <span>토스페이</span>
        </label>
      </div>
    </div>
  )
}

