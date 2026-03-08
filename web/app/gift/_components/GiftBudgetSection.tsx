'use client'

import { Product } from '@/lib/supabase/supabase'
import { GiftBudget, GiftBudgetOption } from '@/lib/gift'
import GiftProductCard, { GiftProductWithPromotion } from './GiftProductCard'

interface GiftBudgetSectionProps {
  selectedBudget: GiftBudget | null
  products: Product[]
  loading: boolean
  onBudgetChange: (budget: GiftBudget | null) => void
}

const BUDGET_OPTIONS: GiftBudgetOption[] = [
  { label: '5만원 미만', value: 'under-50k' },
  { label: '5만원 이상', value: 'over-50k' },
  { label: '10만원 이상', value: 'over-100k' },
  { label: '20만원 이상', value: 'over-200k' },
]

export default function GiftBudgetSection({
  selectedBudget,
  products,
  loading,
  onBudgetChange,
}: GiftBudgetSectionProps) {
  return (
    <section className="container mx-auto px-4 mb-8">
      <h2 className="text-lg font-semibold mb-4">예산에 맞는 선물을 찾는다면</h2>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
        {BUDGET_OPTIONS.map((budget) => (
          <button
            key={budget.value}
            onClick={() => onBudgetChange(selectedBudget === budget.value ? null : budget.value)}
            className={`px-4 py-2.5 text-base rounded-lg font-medium transition flex-shrink-0 ${
              selectedBudget === budget.value
                ? 'bg-red-600 text-white hover:bg-red-600'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            {budget.label}
          </button>
        ))}
      </div>
      {selectedBudget && (
        <>
          {loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 mb-4">
                  <div className="w-28 h-28 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div>
              {products.map((product) => (
                <GiftProductCard
                  key={product.id}
                  product={product as GiftProductWithPromotion}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>해당 예산대의 선물세트가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

