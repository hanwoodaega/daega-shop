'use client'

import { Promotion, PromotionProduct } from '../_types'
import PromotionCard from './PromotionCard'

interface PromotionListProps {
  promotions: Promotion[]
  promotionProductsMap: Map<string, PromotionProduct[]>
  loading: boolean
  onToggleActive: (promotion: Promotion) => void
  onEdit: (promotion: Promotion) => void
  onDelete: (promotionId: string) => void
  onCreateClick: () => void
}

export default function PromotionList({
  promotions,
  promotionProductsMap,
  loading,
  onToggleActive,
  onEdit,
  onDelete,
  onCreateClick,
}: PromotionListProps) {
  if (loading) {
    return <div className="text-center py-12">로딩 중...</div>
  }

  if (promotions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 mb-4">생성된 프로모션이 없습니다</p>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          첫 프로모션 만들기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {promotions.map((promotion) => (
        <PromotionCard
          key={promotion.id}
          promotion={promotion}
          promotionProducts={promotionProductsMap.get(promotion.id)}
          onToggleActive={onToggleActive}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

