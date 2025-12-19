'use client'

import { Promotion } from '../_types'

interface PromotionTypeBadgeProps {
  promotion: Promotion
}

export default function PromotionTypeBadge({ promotion }: PromotionTypeBadgeProps) {
  const getPromotionTypeLabel = () => {
    if (promotion.type === 'bogo') {
      return `${promotion.buy_qty}+1`
    } else {
      return `${promotion.discount_percent}% 할인`
    }
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-bold ${
        promotion.type === 'bogo'
          ? 'bg-pink-100 text-pink-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {getPromotionTypeLabel()}
    </span>
  )
}

