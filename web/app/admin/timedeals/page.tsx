'use client'

import { useAdminTimeDeals } from './_hooks/useAdminTimeDeals'
import { useTimeDealProducts } from './_hooks/useTimeDealProducts'
import { useProductSelector } from './_hooks/useProductSelector'
import { usePromotedProducts } from './_hooks/usePromotedProducts'
import TimeDealHeader from './_components/TimeDealHeader'
import TimeDealList from './_components/TimeDealList'
import TimeDealDetail from './_components/TimeDealDetail'
import TimeDealFormModal from './_components/TimeDealFormModal'
import ProductSelectorModal from './_components/ProductSelectorModal'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function TimeDealsPage() {
  const {
    timeDeals,
    loading,
    selectedTimeDeal,
    showCreateModal,
    editingTimeDeal,
    formData,
    setSelectedTimeDeal,
    openCreateModal,
    openEditModal,
    closeModal,
    updateFormField,
    handleCreate,
    handleUpdate,
    handleDelete,
    isActive,
  } = useAdminTimeDeals()

  const {
    timeDealProducts,
    handleAddProducts,
    handleRemoveProduct,
    handleUpdateProductDiscount,
  } = useTimeDealProducts(selectedTimeDeal)

  const {
    products,
    selectedProducts,
    searchQuery,
    showProductSelector,
    existingProductIds,
    setSearchQuery,
    toggleProduct,
    updateProductDiscount,
    openSelector,
    closeSelector,
    getSelectedProductsArray,
  } = useProductSelector(timeDealProducts)

  const { promotedProductIds } = usePromotedProducts()

  const handleSubmit = async () => {
    if (editingTimeDeal) {
      return await handleUpdate()
    } else {
      return await handleCreate()
    }
  }

  const handleAddProductsSubmit = async () => {
    if (!selectedTimeDeal) return
    const productsArray = getSelectedProductsArray()
    const success = await handleAddProducts(selectedTimeDeal.id, productsArray)
    if (success) {
      closeSelector()
    }
  }

  return (
    <AdminPageLayout title="타임딜 관리">
      <TimeDealHeader onCreateClick={openCreateModal} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TimeDealList
              timeDeals={timeDeals}
              selectedTimeDeal={selectedTimeDeal}
              loading={loading}
              isActive={isActive}
              onSelectTimeDeal={setSelectedTimeDeal}
            />
          </div>

          <div className="lg:col-span-2">
            <TimeDealDetail
              timeDeal={selectedTimeDeal}
              timeDealProducts={timeDealProducts}
              isActive={isActive}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onAddProducts={openSelector}
              onRemoveProduct={(productId) => {
                if (selectedTimeDeal) {
                  handleRemoveProduct(selectedTimeDeal.id, productId)
                }
              }}
              onUpdateProductDiscount={(productId, discountPercent, sortOrder) => {
                if (selectedTimeDeal) {
                  handleUpdateProductDiscount(selectedTimeDeal.id, productId, discountPercent, sortOrder)
                }
              }}
            />
          </div>
        </div>

        <TimeDealFormModal
          isOpen={showCreateModal}
          editingTimeDeal={editingTimeDeal}
          formData={formData}
          onClose={closeModal}
          onUpdateField={updateFormField}
          onSubmit={handleSubmit}
        />

        <ProductSelectorModal
          isOpen={showProductSelector}
          products={products}
          selectedProducts={selectedProducts}
          existingProductIds={existingProductIds}
          promotedProductIds={promotedProductIds}
          searchQuery={searchQuery}
          onClose={closeSelector}
          onSearchChange={setSearchQuery}
          onToggleProduct={toggleProduct}
          onUpdateDiscount={updateProductDiscount}
          onAdd={handleAddProductsSubmit}
        />
    </AdminPageLayout>
  )
}
