import { Product } from '@/lib/supabase/supabase'
import { getTargetSlug, getBudgetSlug } from './categorySlug'
import { fetchCategoryBySlug, updateProductPriority } from './fetchers'

export async function reorderProducts(
  products: Product[],
  index: number,
  direction: 'up' | 'down',
  tabType: 'target' | 'budget' | 'featured',
  selectedTarget?: string,
  selectedBudget?: string
) {
  if (direction === 'up' && index === 0) return
  if (direction === 'down' && index === products.length - 1) return

  const product = products[index]
  const otherIndex = direction === 'up' ? index - 1 : index + 1
  const otherProduct = products[otherIndex]

  const currentOrder =
    tabType === 'target'
      ? (product as any).gift_display_order ?? 999999
      : tabType === 'budget'
      ? (product as any).gift_budget_order ?? 999999
      : (product as any).gift_featured_order ?? 999999

  const otherOrder =
    tabType === 'target'
      ? (otherProduct as any).gift_display_order ?? 999999
      : tabType === 'budget'
      ? (otherProduct as any).gift_budget_order ?? 999999
      : (otherProduct as any).gift_featured_order ?? 999999

  let categorySlug: string

  if (tabType === 'target') {
    if (selectedTarget && selectedTarget !== '전체') {
      categorySlug = getTargetSlug(selectedTarget as any)
    } else {
      // product.gift_target은 이미 slug 값 (child, parent, lover, friend)
      const firstTarget =
        Array.isArray((product as any).gift_target) && (product as any).gift_target.length > 0
          ? (product as any).gift_target[0]
          : 'child' // fallback도 slug 값 사용
      // 이미 slug이므로 그대로 사용 (getTargetSlug는 label을 slug로 변환하는 함수)
      categorySlug = firstTarget
    }
  } else if (tabType === 'budget') {
    if (selectedBudget && selectedBudget !== '전체') {
      categorySlug = getBudgetSlug(selectedBudget)
    } else {
      // product.gift_budget_targets는 이미 slug 값 (under-50k, over-50k, etc.)
      const firstBudget =
        Array.isArray((product as any).gift_budget_targets) &&
        (product as any).gift_budget_targets.length > 0
          ? (product as any).gift_budget_targets[0]
          : 'under-50k' // fallback도 slug 값 사용
      // 이미 slug이므로 그대로 사용 (getBudgetSlug는 label을 slug로 변환하는 함수)
      categorySlug = firstBudget
    }
  } else {
    categorySlug = 'featured'
  }

  const category = await fetchCategoryBySlug(categorySlug)
  if (!category) throw new Error('카테고리를 찾을 수 없습니다')

  await updateProductPriority(category.id, product.id, otherOrder)
  await updateProductPriority(category.id, otherProduct.id, currentOrder)
}

