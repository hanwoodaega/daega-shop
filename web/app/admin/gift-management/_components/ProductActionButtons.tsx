import { TabType, GiftTarget, GIFT_TARGETS, BUDGET_CATEGORIES } from '../_types'
import { getTargetSlug } from '../_utils/categorySlug'

// 스타일 상수
const BASE_BTN =
  'px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
const SELECTED_BTN = 'bg-pink-600 text-white hover:bg-pink-700'
const NORMAL_BTN = 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
const REMOVE_BTN =
  'px-4 py-2 rounded-lg text-sm font-medium transition bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed'

interface ProductActionButtonsProps {
  activeTab: TabType
  currentTargets: string[]
  isSaving: boolean
  isReordering: boolean
  onTargetToggle?: (target: GiftTarget) => void
  onBudgetToggle?: (budget: string) => void
  onFeaturedToggle?: () => void
}

export default function ProductActionButtons({
  activeTab,
  currentTargets,
  isSaving,
  isReordering,
  onTargetToggle,
  onBudgetToggle,
  onFeaturedToggle,
}: ProductActionButtonsProps) {
  const disabled = isSaving || isReordering

  // featured 탭인 경우 제거 버튼만 표시
  if (activeTab === 'featured') {
    return (
      <div className="flex-shrink-0">
        <button onClick={onFeaturedToggle} disabled={disabled} className={REMOVE_BTN}>
          제거
        </button>
      </div>
    )
  }

  // target/budget 탭인 경우 토글 버튼들 표시
  return (
    <div className="flex-shrink-0">
      <div className="grid grid-cols-2 gap-2">
        {activeTab === 'target' ? (
          GIFT_TARGETS.map((target) => {
            const targetSlug = getTargetSlug(target)
            const isSelected = currentTargets.includes(targetSlug)
            return (
              <button
                key={target}
                onClick={() => onTargetToggle?.(target)}
                disabled={disabled}
                className={`${BASE_BTN} ${isSelected ? SELECTED_BTN : NORMAL_BTN}`}
              >
                {target}
              </button>
            )
          })
        ) : (
          BUDGET_CATEGORIES.map((budget) => {
            const isSelected = currentTargets.includes(budget.value)
            return (
              <button
                key={budget.value}
                onClick={() => onBudgetToggle?.(budget.value)}
                disabled={disabled}
                className={`${BASE_BTN} ${isSelected ? SELECTED_BTN : NORMAL_BTN}`}
              >
                {budget.label}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
