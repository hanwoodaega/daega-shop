'use client'

import { useRouter } from 'next/navigation'

interface PaymentMethodSelectorProps {
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
}

export default function PaymentMethodSelector({
  paymentMethod,
  onPaymentMethodChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">결제 방법</h2>
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="card" 
            checked={paymentMethod === 'card'}
            onChange={() => onPaymentMethodChange('card')}
            className="w-4 h-4" 
          />
          <span>신용/체크카드</span>
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
          <span>네이버페이(카드)</span>
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
          <span>카카오페이(카드)</span>
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
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="radio" 
            name="payment" 
            value="samsungpay" 
            checked={paymentMethod === 'samsungpay'}
            onChange={() => onPaymentMethodChange('samsungpay')}
            className="w-4 h-4" 
          />
          <span>삼성페이</span>
        </label>
      </div>
    </div>
  )
}

