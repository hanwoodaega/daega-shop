'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TabType } from '../_types'
import { useAllProducts } from '../_hooks/useAllProducts'
import { useGiftProducts } from '../_hooks/useGiftProducts'
import { useBudgetProducts } from '../_hooks/useBudgetProducts'
import { useFeaturedProducts } from '../_hooks/useFeaturedProducts'
import { useDebounce } from '../_hooks/useDebounce'
import { useGiftManagementActions } from '../_hooks/useGiftManagementActions'
import GiftTabs from './GiftTabs'
import Filters from './Filters'
import ProductList from './ProductList'
import AddProductForm from './AddProductForm'

export default function GiftManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('target')
  const [selectedTarget, setSelectedTarget] = useState<string>('전체')
  const [selectedBudget, setSelectedBudget] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch products
  const { allProducts, refetch: refetchAllProducts } = useAllProducts(debouncedSearchQuery)
  const {
    giftProducts,
    loading: loadingGift,
    refetch: refetchGiftProducts,
  } = useGiftProducts(selectedTarget)
  const {
    budgetProducts,
    loading: loadingBudget,
    refetch: refetchBudgetProducts,
  } = useBudgetProducts(selectedBudget)
  const {
    featuredProducts,
    loading: loadingFeatured,
    refetch: refetchFeaturedProducts,
  } = useFeaturedProducts()

  const currentProducts =
    activeTab === 'target'
      ? giftProducts
      : activeTab === 'budget'
      ? budgetProducts
      : featuredProducts

  const currentLoading =
    activeTab === 'target'
      ? loadingGift
      : activeTab === 'budget'
      ? loadingBudget
      : loadingFeatured

  // Actions hook
  const {
    saving,
    reordering,
    handleTargetToggle,
    handleBudgetToggle,
    handleFeaturedToggle,
    handleReorder,
    handleAddSuccess: handleAddSuccessAction,
  } = useGiftManagementActions({
    activeTab,
    selectedTarget,
    selectedBudget,
    currentProducts,
    refetchGiftProducts,
    refetchBudgetProducts,
    refetchFeaturedProducts,
    refetchAllProducts,
  })

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setShowAddForm(false)
  }

  const handleAddSuccess = () => {
    setShowAddForm(false)
    handleAddSuccessAction()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-neutral-600 hover:text-neutral-900 mb-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                뒤로가기
              </button>
              <h1 className="text-2xl font-semibold">선물관 관리</h1>
              <p className="text-sm text-neutral-500 mt-1">
                선물 대상 및 예산별로 상품을 설정하고 관리하세요
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
            >
              {showAddForm ? '취소' : '+ 상품 추가'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <GiftTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {showAddForm && (
          <AddProductForm
            activeTab={activeTab}
            productData={{
              allProducts,
              giftProducts,
              budgetProducts,
              featuredProducts,
            }}
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <Filters
          activeTab={activeTab}
          selectedTarget={selectedTarget}
          selectedBudget={selectedBudget}
          searchQuery={searchQuery}
          onTargetChange={setSelectedTarget}
          onBudgetChange={setSelectedBudget}
          onSearchChange={setSearchQuery}
        />

        <ProductList
          products={currentProducts}
          loading={currentLoading}
          activeTab={activeTab}
          saving={saving}
          reordering={reordering}
          onMoveUp={(index: number) => handleReorder('up', index)}
          onMoveDown={(index: number) => handleReorder('down', index)}
          onTargetToggle={handleTargetToggle}
          onBudgetToggle={handleBudgetToggle}
          onFeaturedToggle={handleFeaturedToggle}
        />
      </main>
    </div>
  )
}

