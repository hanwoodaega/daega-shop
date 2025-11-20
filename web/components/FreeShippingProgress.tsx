'use client'

import { formatPrice } from '@/lib/utils'
import { SHIPPING } from '@/lib/constants'
import { useMemo } from 'react'

interface FreeShippingProgressProps {
  totalPrice: number
  threshold?: number
  deliveryMethod?: 'pickup' | 'quick' | 'regular'
  className?: string
}

export default function FreeShippingProgress({ 
  totalPrice, 
  threshold = SHIPPING.FREE_THRESHOLD,
  deliveryMethod = 'regular',
  className = '' 
}: FreeShippingProgressProps) {
  // 택배배송(regular)이 아니면 표시하지 않음
  if (deliveryMethod !== 'regular') {
    return null
  }

  const progressData = useMemo(() => {
    const remaining = Math.max(0, threshold - totalPrice)
    const percentage = Math.min(100, Math.round((totalPrice / threshold) * 100))
    const isCompleted = totalPrice >= threshold
    
    return { remaining, percentage, isCompleted }
  }, [totalPrice, threshold])

  const { remaining, percentage, isCompleted } = progressData

  return (
    <div className={className}>
      {/* 메시지 - 바 위 */}
      <div className="mb-1.5 text-right">
        {isCompleted ? (
          <p className="text-xs font-bold text-gray-900">
            무료배송!
          </p>
        ) : (
          <p className="text-xs font-bold text-gray-900">
            {formatPrice(remaining)}원 더 담으면 무료배송!
          </p>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ease-out ${
            isCompleted 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-blue-900'
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* 애니메이션 효과 */}
          {isCompleted && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
          )}
        </div>
      </div>

      {/* 목표 금액 표시 - 바 오른쪽 아래 */}
      <div className="mt-1 text-right">
        <p className="text-xs text-gray-500">5만원</p>
      </div>
    </div>
  )
}

// 애니메이션용 CSS (globals.css에 추가 필요)
/*
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
*/

