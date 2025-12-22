import { useState, useMemo } from 'react'
import { Product } from '@/lib/supabase/supabase'
import { TabType, GiftTarget, GIFT_TARGETS, BUDGET_CATEGORIES } from '../_types'
import toast from 'react-hot-toast'
import { fetchCategoryBySlug, addProductToCategory } from '../_utils/fetchers'
import { getTargetSlug } from '../_utils/categorySlug'

interface ProductData {
  allProducts: Product[]
  giftProducts: Product[]
  budgetProducts: Product[]
  featuredProducts: Product[]
}

interface AddProductFormProps {
  activeTab: TabType
  productData: ProductData
  onSuccess: () => void
  onCancel: () => void
}

export default function AddProductForm({
  activeTab,
  productData,
  onSuccess,
  onCancel,
}: AddProductFormProps) {
  const { allProducts, giftProducts, budgetProducts, featuredProducts } = productData
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedTargets, setSelectedTargets] = useState<GiftTarget[]>([])
  const [selectedBudgetTargets, setSelectedBudgetTargets] = useState<string[]>([])
  const [displayOrder, setDisplayOrder] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // useMemo로 availableProducts 최적화
  const availableProducts = useMemo(() => {
    if (activeTab === 'target') {
      return allProducts.filter((p) => !giftProducts.some((gp) => gp.id === p.id))
    }
    if (activeTab === 'budget') {
      return allProducts.filter((p) => !budgetProducts.some((bp) => bp.id === p.id))
    }
    return allProducts.filter((p) => !featuredProducts.some((fp) => fp.id === p.id))
  }, [activeTab, allProducts, giftProducts, budgetProducts, featuredProducts])

  // 유효성 검사 로직 분리
  const isValid = (): boolean => {
    if (!selectedProductId) return false
    if (activeTab === 'target' && selectedTargets.length === 0) return false
    if (activeTab === 'budget' && selectedBudgetTargets.length === 0) return false
    if (!displayOrder || displayOrder < 1) return false
    return true
  }

  // 전략 패턴으로 addActions 정의
  const addActions = {
    target: async (order: number) => {
      for (const target of selectedTargets) {
        const slug = getTargetSlug(target)
        const category = await fetchCategoryBySlug(slug)
        if (!category) continue
        await addProductToCategory(category.id, selectedProductId, order)
      }
    },
    budget: async (order: number) => {
      for (const budgetSlug of selectedBudgetTargets) {
        const category = await fetchCategoryBySlug(budgetSlug)
        if (!category) continue
        await addProductToCategory(category.id, selectedProductId, order)
      }
    },
    featured: async (order: number) => {
      const category = await fetchCategoryBySlug('featured')
      if (!category) throw new Error('실시간 인기 카테고리를 찾을 수 없습니다')
      await addProductToCategory(category.id, selectedProductId, order)
    },
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('모든 항목을 올바르게 입력해주세요')
      return
    }

    if (!displayOrder || displayOrder < 1) {
      toast.error('우선순위는 1 이상의 숫자여야 합니다')
      return
    }

    setSaving(true)
    try {
      await addActions[activeTab](displayOrder)

      toast.success('상품이 추가되었습니다')
      setSelectedProductId('')
      setSelectedTargets([])
      setSelectedBudgetTargets([])
      setDisplayOrder(null)
      onSuccess()
    } catch (error: any) {
      console.error('상품 추가 실패:', error)
      toast.error(error.message || '상품 추가에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-neutral-200">
      <h2 className="text-lg font-semibold mb-4">상품 추가</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">상품 선택</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          >
            <option value="">상품을 선택하세요</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.price.toLocaleString()}원)
              </option>
            ))}
          </select>
        </div>
        {activeTab === 'target' ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              선물 대상 (중복 선택 가능)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GIFT_TARGETS.map((target) => (
                <label
                  key={target}
                  className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(target)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargets([...selectedTargets, target])
                      } else {
                        setSelectedTargets(selectedTargets.filter((t) => t !== target))
                      }
                    }}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <span className="text-sm font-medium">{target}</span>
                </label>
              ))}
            </div>
          </div>
        ) : activeTab === 'budget' ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              예산 카테고리 (중복 선택 가능)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_CATEGORIES.map((budget) => (
                <label
                  key={budget.value}
                  className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBudgetTargets.includes(budget.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBudgetTargets([...selectedBudgetTargets, budget.value])
                      } else {
                        setSelectedBudgetTargets(
                          selectedBudgetTargets.filter((b) => b !== budget.value)
                        )
                      }
                    }}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <span className="text-sm font-medium">{budget.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            우선순위 (숫자가 작을수록 앞에 표시)
          </label>
          <input
            type="number"
            value={displayOrder ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setDisplayOrder(value === '' ? null : Number(value))
            }}
            placeholder="예: 1 (첫 번째), 2 (두 번째)..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !isValid()}
            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            추가하기
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition font-medium"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
