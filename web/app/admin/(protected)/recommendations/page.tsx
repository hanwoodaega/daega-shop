'use client'

import { useEffect } from 'react'
import { useAdminRecommendations } from './_hooks/useAdminRecommendations'
import { useRecommendationProducts } from './_hooks/useRecommendationProducts'
import { useProductSelector } from './_hooks/useProductSelector'
import RecommendationHeader from './_components/RecommendationHeader'
import RecommendationCategoryList from './_components/RecommendationCategoryList'
import RecommendationDetail from './_components/RecommendationDetail'
import RecommendationFormModal from './_components/RecommendationFormModal'
import ProductSelectorModal from './_components/ProductSelectorModal'
import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'

export default function RecommendationsPage() {
  const {
    categories,
    loading,
    showCreateModal,
    editingCategory,
    selectedCategory,
    formData,
    fetchCategories,
    setSelectedCategory,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useAdminRecommendations()

  const {
    categoryProducts,
    handleAddProducts,
    handleRemoveProduct,
    handleUpdateSortOrder,
  } = useRecommendationProducts(selectedCategory?.id || null)

  const {
    availableProducts,
    selectedProducts,
    searchQuery,
    showProductSelector,
    setSearchQuery,
    toggleProduct,
    updateProductSortOrder,
    openSelector,
    closeSelector,
  } = useProductSelector(categoryProducts)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleSubmit = async () => {
    if (editingCategory) {
      return await handleUpdate()
    } else {
      return await handleCreate()
    }
  }

  const handleAddProductsClick = () => {
    openSelector()
  }

  const handleAddProductsSubmit = async () => {
    if (!selectedCategory) return
    const success = await handleAddProducts(selectedCategory.id, selectedProducts)
    if (success) {
      closeSelector()
    }
  }

  if (loading) {
    return (
      <AdminPageLayout title="추천 상품 관리">
        <div className="flex items-center justify-center py-12">
          <p>로딩 중...</p>
        </div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout title="추천 상품 관리">
      <RecommendationHeader onCreateClick={openCreateModal} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RecommendationCategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <div className="lg:col-span-2">
            <RecommendationDetail
              category={selectedCategory}
              categoryProducts={categoryProducts}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onAddProducts={handleAddProductsClick}
              onRemoveProduct={(productId) => {
                if (selectedCategory) {
                  handleRemoveProduct(selectedCategory.id, productId)
                }
              }}
              onUpdateSortOrder={(productId, sortOrder) => {
                if (selectedCategory) {
                  handleUpdateSortOrder(selectedCategory.id, productId, sortOrder)
                }
              }}
            />
          </div>
        </div>

        <RecommendationFormModal
          isOpen={showCreateModal}
          editingCategory={editingCategory}
          formData={formData}
          onClose={closeModal}
          onUpdateField={updateFormField}
          onSubmit={handleSubmit}
        />

        <ProductSelectorModal
          isOpen={showProductSelector}
          availableProducts={availableProducts}
          selectedProducts={selectedProducts}
          searchQuery={searchQuery}
          onClose={closeSelector}
          onSearchChange={setSearchQuery}
          onToggleProduct={toggleProduct}
          onUpdateSortOrder={updateProductSortOrder}
          onAdd={handleAddProductsSubmit}
        />
    </AdminPageLayout>
  )
}
