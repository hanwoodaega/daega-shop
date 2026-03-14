'use client'

import { useAdminPromotions } from './_hooks/useAdminPromotions'
import { usePromotionProducts } from './_hooks/usePromotionProducts'
import { useProductSelector } from './_hooks/useProductSelector'
import PromotionHeader from './_components/PromotionHeader'
import PromotionList from './_components/PromotionList'
import PromotionCreateModal from './_components/PromotionCreateModal'
import ProductSelectorModal from './_components/ProductSelectorModal'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function PromotionsPage() {
  const {
    promotions,
    loading,
    showCreateModal,
    editingPromotion,
    formData,
    handleCreate,
    handleUpdate,
    handleDelete,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
  } = useAdminPromotions()

  const { promotionProductsMap, promotedProductIds } = usePromotionProducts(promotions)

  const {
    products,
    selectedProducts,
    searchQuery,
    showProductSelector,
    filteredProducts,
    setSearchQuery,
    setShowProductSelector,
    toggleProduct,
    setSelection,
  } = useProductSelector()

  const handleEdit = async (promotion: any) => {
    await openEditModal(promotion, (productIds) => {
      setSelection(productIds)
    })
  }

  const handleSubmit = async (productIds: string[]) => {
    if (editingPromotion) {
      return await handleUpdate()
    } else {
      return await handleCreate(productIds)
    }
  }

  return (
    <AdminPageLayout title="프로모션 관리">
      <PromotionHeader onCreateClick={openCreateModal} />

        <PromotionList
          promotions={promotions}
          promotionProductsMap={promotionProductsMap}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateClick={openCreateModal}
        />

        <PromotionCreateModal
          isOpen={showCreateModal}
          editingPromotion={editingPromotion}
          formData={formData}
          selectedProducts={selectedProducts}
          products={products}
          onClose={closeModal}
          onUpdateField={updateFormField}
          onToggleProduct={toggleProduct}
          onOpenProductSelector={() => setShowProductSelector(true)}
          onSubmit={handleSubmit}
        />

        <ProductSelectorModal
          isOpen={showProductSelector}
          products={products}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
          searchQuery={searchQuery}
          promotedProductIds={promotedProductIds}
          editingPromotionId={editingPromotion?.id || null}
          onClose={() => setShowProductSelector(false)}
          onSearchChange={setSearchQuery}
          onToggleProduct={toggleProduct}
        />
    </AdminPageLayout>
  )
}
