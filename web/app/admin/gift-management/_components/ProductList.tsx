import { Product } from '@/lib/supabase'
import { TabType } from '../_types'
import ProductItem from './ProductItem'

interface ProductListProps {
  products: (Product & {
    gift_display_order?: number
    gift_budget_order?: number
    gift_featured_order?: number
    gift_target?: string[]
    gift_budget_targets?: string[]
  })[]
  loading: boolean
  activeTab: TabType
  saving: string | null
  reordering: string | null
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onTargetToggle?: (productId: string, target: any) => void
  onBudgetToggle?: (productId: string, budget: string) => void
  onFeaturedToggle?: (productId: string) => void
}

export default function ProductList({
  products,
  loading,
  activeTab,
  saving,
  reordering,
  onMoveUp,
  onMoveDown,
  onTargetToggle,
  onBudgetToggle,
  onFeaturedToggle,
}: ProductListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
        <p className="text-neutral-500 mt-4">로딩 중...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-neutral-200">
        <p className="text-neutral-500">
          {activeTab === 'target'
            ? '선물 대상'
            : activeTab === 'budget'
            ? '예산 카테고리'
            : '실시간 인기 선물세트'}
          이 설정된 상품이 없습니다
        </p>
        <p className="text-sm text-neutral-400 mt-2">상품 추가 버튼을 눌러 상품을 추가하세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <ProductItem
          key={product.id}
          product={product}
          index={index}
          totalLength={products.length}
          activeTab={activeTab}
          saving={saving}
          reordering={reordering}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onTargetToggle={
            onTargetToggle
              ? (target) => onTargetToggle(product.id, target)
              : undefined
          }
          onBudgetToggle={
            onBudgetToggle
              ? (budget) => onBudgetToggle(product.id, budget)
              : undefined
          }
          onFeaturedToggle={onFeaturedToggle ? () => onFeaturedToggle(product.id) : undefined}
        />
      ))}
    </div>
  )
}

