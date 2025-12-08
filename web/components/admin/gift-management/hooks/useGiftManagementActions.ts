import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { TabType, GiftTarget } from '../types'
import { reorderProducts } from '../utils/reorder'
import {
  toggleTargetCategory,
  toggleBudgetCategory,
  toggleFeaturedCategory,
  checkProductInCategory,
  fetchCategoryBySlug,
} from '../utils/fetchers'
import { getTargetSlug } from '../utils/categorySlug'
import { handleUnauthorized } from '../utils/auth'

interface UseGiftManagementActionsProps {
  activeTab: TabType
  selectedTarget: string
  selectedBudget: string
  currentProducts: any[]
  refetchGiftProducts: () => void
  refetchBudgetProducts: () => void
  refetchFeaturedProducts: () => void
  refetchAllProducts: () => void
}

export function useGiftManagementActions({
  activeTab,
  selectedTarget,
  selectedBudget,
  currentProducts,
  refetchGiftProducts,
  refetchBudgetProducts,
  refetchFeaturedProducts,
  refetchAllProducts,
}: UseGiftManagementActionsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)

  const refetchCurrentProducts = () => {
    if (activeTab === 'target') {
      refetchGiftProducts()
    } else if (activeTab === 'budget') {
      refetchBudgetProducts()
    } else {
      refetchFeaturedProducts()
    }
  }

  const handleTargetToggle = async (productId: string, target: GiftTarget) => {
    setSaving(productId)
    try {
      const slug = getTargetSlug(target)
      const category = await fetchCategoryBySlug(slug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      const isInCategory = await checkProductInCategory(category.id, productId)
      await toggleTargetCategory(productId, target, isInCategory)

      toast.success('선물 대상이 업데이트되었습니다')
      refetchGiftProducts()
    } catch (error: any) {
      if (handleUnauthorized(router, error)) return
      console.error('선물 대상 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleBudgetToggle = async (productId: string, budgetSlug: string) => {
    setSaving(productId)
    try {
      const category = await fetchCategoryBySlug(budgetSlug)
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      const isInCategory = await checkProductInCategory(category.id, productId)
      await toggleBudgetCategory(productId, budgetSlug, isInCategory)

      toast.success('예산 카테고리가 업데이트되었습니다')
      refetchBudgetProducts()
    } catch (error: any) {
      if (handleUnauthorized(router, error)) return
      console.error('예산 카테고리 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleFeaturedToggle = async (productId: string) => {
    setSaving(productId)
    try {
      const category = await fetchCategoryBySlug('featured')
      if (!category) throw new Error('카테고리를 찾을 수 없습니다')

      const isInCategory = await checkProductInCategory(category.id, productId)
      await toggleFeaturedCategory(productId, isInCategory)

      toast.success('인기 선물세트 설정이 업데이트되었습니다')
      refetchFeaturedProducts()
    } catch (error: any) {
      if (handleUnauthorized(router, error)) return
      console.error('인기 선물세트 업데이트 실패:', error)
      toast.error('업데이트에 실패했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleReorder = async (direction: 'up' | 'down', index: number) => {
    const product = currentProducts[index]
    if (!product) return

    setReordering(product.id)
    try {
      await reorderProducts(
        currentProducts,
        index,
        direction,
        activeTab,
        selectedTarget,
        selectedBudget
      )

      toast.success('순서가 변경되었습니다')
      refetchCurrentProducts()
    } catch (error) {
      console.error('순서 변경 실패:', error)
      toast.error('순서 변경에 실패했습니다')
      refetchCurrentProducts()
    } finally {
      setReordering(null)
    }
  }

  const handleAddSuccess = () => {
    refetchCurrentProducts()
    refetchAllProducts()
  }

  return {
    saving,
    reordering,
    handleTargetToggle,
    handleBudgetToggle,
    handleFeaturedToggle,
    handleReorder,
    handleAddSuccess,
  }
}

