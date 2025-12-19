'use client'

import { Promotion, PromotionProduct } from '../_types'
import PromotionTypeBadge from './PromotionTypeBadge'

interface PromotionCardProps {
  promotion: Promotion
  promotionProducts?: PromotionProduct[]
  onToggleActive: (promotion: Promotion) => void
  onEdit: (promotion: Promotion) => void
  onDelete: (promotionId: string) => void
}

export default function PromotionCard({
  promotion,
  promotionProducts,
  onToggleActive,
  onEdit,
  onDelete,
}: PromotionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold">{promotion.title}</h3>
            <PromotionTypeBadge promotion={promotion} />
            <span
              className={`px-2 py-1 rounded text-xs ${
                promotion.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {promotion.is_active ? '활성' : '비활성'}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>생성일: {new Date(promotion.created_at).toLocaleString('ko-KR')}</p>
          </div>
          
          {/* 프로모션에 포함된 상품 목록 */}
          {promotionProducts && promotionProducts.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">
                포함된 상품 ({promotionProducts.length}개)
              </p>
              <div className="flex flex-wrap gap-2">
                {promotionProducts.map((pp) => {
                  const product = Array.isArray(pp.products) ? pp.products[0] : pp.products
                  return product ? (
                    <span
                      key={pp.id}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {product.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleActive(promotion)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            {promotion.is_active ? '비활성화' : '활성화'}
          </button>
          <button
            onClick={() => onEdit(promotion)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(promotion.id)}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

