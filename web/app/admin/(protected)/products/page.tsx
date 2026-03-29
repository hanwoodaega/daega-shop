'use client'

import { useState } from 'react'
import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'
import { useAdminProducts } from './_hooks/useAdminProducts'
import ProductHeader from './_components/ProductHeader'
import ProductToolbar from './_components/ProductToolbar'
import ProductTable from './_components/ProductTable'
import ProductPagination from './_components/ProductPagination'
import ProductCreateModal from './_components/ProductCreateModal'
import ProductEditModal from './_components/ProductEditModal'
import { PRODUCT_LIST_LIMIT } from './constants'
import toast from 'react-hot-toast'

export default function AdminProductManagementPage() {
  const {
    form,
    uiState,
    listState,
    isCreateOpen,
    editing,
    savingEdit,
    togglingSoldOut,
    updateFormField,
    handleSubmit,
    removeItem,
    startEdit,
    toggleSoldOut,
    saveEdit,
    updateListFilter,
    openCreateModal,
    closeCreateModal,
    clearError,
    setEditing,
    fetchList,
  } = useAdminProducts()

  const handleRemove = async (productId: string) => {
    const confirmed = window.confirm('삭제하시겠습니까?')
    if (!confirmed) return
    const success = await removeItem(productId)
    if (success) {
      toast.success('상품이 삭제되었습니다.', { duration: 2000 })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <ProductHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Operations</p>
              <h2 className="text-lg font-semibold text-neutral-900">상품 목록 관리</h2>
              <p className="text-sm text-neutral-500 mt-1">
                상품 추가 버튼을 눌러 새 상품을 등록하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900"
              >
                상품 추가
              </button>
            </div>
          </div>
          {uiState.error && (
            <div className="mt-4">
              <p className="text-sm text-red-600">{uiState.error}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-neutral-400">
            재고 입력 없이 등록되며, 목록의 "품절처리/판매재개" 버튼으로 상태를 직접 전환할 수
            있습니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <ProductToolbar
            listState={listState}
            onUpdateFilter={updateListFilter}
            onSearch={fetchList}
            onCreateClick={openCreateModal}
          />

          {uiState.loadingList ? (
            <p className="text-sm text-neutral-500">불러오는 중...</p>
          ) : listState.items.length === 0 ? (
            <p className="text-sm text-neutral-500">등록된 상품이 없습니다.</p>
          ) : (
            <>
              <ProductTable
                products={listState.items}
                togglingSoldOut={togglingSoldOut}
                onEdit={startEdit}
                onToggleSoldOut={toggleSoldOut}
                onRemove={handleRemove}
              />

              <ProductPagination
                listState={listState}
                limit={PRODUCT_LIST_LIMIT}
                onPageChange={(page) => updateListFilter('page', page)}
                onFetchList={fetchList}
              />
            </>
          )}
        </div>
      </main>

      <ProductCreateModal
        isOpen={isCreateOpen}
        form={form}
        loading={uiState.loading}
        error={uiState.error}
        onClose={closeCreateModal}
        onUpdateField={updateFormField}
        onSubmit={handleSubmit}
      />

      <ProductEditModal
        editing={editing}
        setEditing={setEditing}
        saveEdit={saveEdit}
        savingEdit={savingEdit}
        allProducts={listState.items}
      />
    </div>
  )
}
