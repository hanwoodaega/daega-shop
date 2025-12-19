import { useMemo } from 'react'
import { TabType, GIFT_TARGETS, BUDGET_CATEGORIES } from '../_types'

const ALL = '전체'

interface FiltersProps {
  activeTab: TabType
  selectedTarget: string
  selectedBudget: string
  searchQuery: string
  onTargetChange: (target: string) => void
  onBudgetChange: (budget: string) => void
  onSearchChange: (query: string) => void
}

export default function Filters({
  activeTab,
  selectedTarget,
  selectedBudget,
  searchQuery,
  onTargetChange,
  onBudgetChange,
  onSearchChange,
}: FiltersProps) {
  // label 텍스트 미리 계산
  const filterLabel = activeTab === 'target' ? '선물 대상' : '예산 카테고리'

  // select 옵션 미리 계산
  const options = useMemo(() => {
    if (activeTab === 'target') {
      return GIFT_TARGETS.map((target) => ({ label: target, value: target }))
    }
    return BUDGET_CATEGORIES.map((budget) => ({ label: budget.label, value: budget.value }))
  }, [activeTab])

  // 현재 선택된 값
  const selectedValue = activeTab === 'target' ? selectedTarget : selectedBudget

  // onChange 핸들러
  const handleChange = (value: string) => {
    if (activeTab === 'target') {
      onTargetChange(value)
    } else {
      onBudgetChange(value)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-neutral-200">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {filterLabel}
          </label>
          <select
            value={selectedValue}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          >
            <option value={ALL}>{ALL}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-700 mb-2">상품 검색</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="상품명으로 검색..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          />
        </div>
      </div>
    </div>
  )
}
