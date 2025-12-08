import { useMemo } from 'react'
import { Product } from '@/lib/supabase'
import { TabType, GiftTarget } from '../types'
import OrderButtons from './OrderButtons'
import ProductActionButtons from './ProductActionButtons'
import { getBudgetLabel, getTargetLabel } from '../utils/categorySlug'

interface ProductItemProps {
  product: Product & {
    gift_display_order?: number
    gift_budget_order?: number
    gift_featured_order?: number
    gift_target?: string[]
    gift_budget_targets?: string[]
  }
  index: number
  totalLength: number
  activeTab: TabType
  saving: string | null
  reordering: string | null
  onMoveUp: () => void
  onMoveDown: () => void
  onTargetToggle?: (target: GiftTarget) => void
  onBudgetToggle?: (budget: string) => void
  onFeaturedToggle?: () => void
}

export default function ProductItem({
  product,
  index,
  totalLength,
  activeTab,
  saving,
  reordering,
  onMoveUp,
  onMoveDown,
  onTargetToggle,
  onBudgetToggle,
  onFeaturedToggle,
}: ProductItemProps) {
  const isSaving = saving === product.id
  const isReordering = reordering === product.id

  // useMemo로 currentTargets 캐싱 (의존성 배열 최적화)
  const currentTargets = useMemo(() => {
    if (activeTab === 'target') {
      return Array.isArray(product.gift_target) ? product.gift_target : []
    }
    if (activeTab === 'budget') {
      return Array.isArray(product.gift_budget_targets) ? product.gift_budget_targets : []
    }
    return []
  }, [activeTab, product])

  // useMemo로 displayOrder 캐싱 (의존성 배열 최적화)
  const displayOrder = useMemo(() => {
    if (activeTab === 'target') return product.gift_display_order
    if (activeTab === 'budget') return product.gift_budget_order
    return product.gift_featured_order
  }, [activeTab, product])

  // 대상/예산 라벨 텍스트 생성 (slug를 한글로 변환)
  const targetsLabel = useMemo(() => {
    if (activeTab === 'featured' || currentTargets.length === 0) return ''
    return currentTargets
      .map((slug: string) => {
        if (activeTab === 'target') return getTargetLabel(slug)
        return getBudgetLabel(slug)
      })
      .join(', ')
  }, [activeTab, currentTargets])

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <OrderButtons
            index={index}
            totalLength={totalLength}
            isReordering={isReordering}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 mb-1">{product.name}</h3>
            <p className="text-sm text-neutral-500">
              {product.brand && `${product.brand} · `}
              {product.price.toLocaleString()}원
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              우선순위: {displayOrder ?? '미설정'}
              {targetsLabel && ` · ${activeTab === 'target' ? '대상' : '예산'}: ${targetsLabel}`}
            </p>
          </div>
        </div>
        <ProductActionButtons
          activeTab={activeTab}
          currentTargets={currentTargets}
          isSaving={isSaving}
          isReordering={isReordering}
          onTargetToggle={onTargetToggle}
          onBudgetToggle={onBudgetToggle}
          onFeaturedToggle={onFeaturedToggle}
        />
      </div>
    </div>
  )
}
