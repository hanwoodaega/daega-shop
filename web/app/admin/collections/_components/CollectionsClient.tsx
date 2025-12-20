'use client'

import { useCollections } from '../_hooks/useCollections'
import CollectionHeader from './CollectionHeader'
import CollectionList from './CollectionList'
import CollectionDetail from './CollectionDetail'
import CollectionFormModal from './CollectionFormModal'
import AdminPageLayout from '../../_components/AdminPageLayout'
import type { Collection, Product } from '../_types'

export interface CollectionsClientProps {
  initialCollections: Collection[]
  initialProducts: Product[]
  initialPromotedProductIds: string[] // 서버에서 배열로 전달 (Set은 직렬화 불가)
}

export default function CollectionsClient({
  initialCollections,
  initialProducts,
  initialPromotedProductIds,
}: CollectionsClientProps) {
  const {
    collections,
    selectedCollection,
    showCreateModal,
    editingCollection,
    promotedProductIds,
    setSelectedCollection,
    handleCollectionCreated,
    handleCollectionUpdated,
    handleCollectionDeleted,
    openEditModal,
    openCreateModal,
    closeModal,
  } = useCollections(initialCollections, initialPromotedProductIds)

  return (
    <AdminPageLayout title="컬렉션 관리">
      <CollectionHeader onCreateClick={openCreateModal} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 컬렉션 목록 */}
          <div className="lg:col-span-1">
            <CollectionList
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={setSelectedCollection}
            />
          </div>

          {/* 컬렉션 상세 */}
          <div className="lg:col-span-2">
            <CollectionDetail
              collection={selectedCollection}
              onEdit={openEditModal}
              onDelete={handleCollectionDeleted}
              initialProducts={initialProducts}
              promotedProductIds={promotedProductIds}
            />
          </div>
        </div>

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <CollectionFormModal
            editingCollection={editingCollection}
            onClose={closeModal}
            onSuccess={editingCollection ? handleCollectionUpdated : handleCollectionCreated}
          />
        )}
    </AdminPageLayout>
  )
}
