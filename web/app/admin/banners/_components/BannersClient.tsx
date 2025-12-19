'use client'

import { useBanners } from '../_hooks/useBanners'
import BannerHeader from './BannerHeader'
import BannerList from './BannerList'
import BannerDetail from './BannerDetail'
import BannerFormModal from './BannerFormModal'
import type { Banner, Product } from '../_types'

export interface BannersClientProps {
  initialBanners: Banner[]
  initialProducts: Product[]
}

export default function BannersClient({ initialBanners, initialProducts }: BannersClientProps) {
  const {
    banners,
    selectedBanner,
    showCreateModal,
    editingBanner,
    setSelectedBanner,
    handleBannerCreated,
    handleBannerUpdated,
    handleBannerDeleted,
    openEditModal,
    openCreateModal,
    closeModal,
  } = useBanners(initialBanners)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <BannerHeader onCreateClick={openCreateModal} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 배너 목록 */}
          <div className="lg:col-span-1">
            <BannerList
              banners={banners}
              selectedBanner={selectedBanner}
              onSelectBanner={setSelectedBanner}
            />
          </div>

          {/* 배너 상세 */}
          <div className="lg:col-span-2">
            <BannerDetail
              banner={selectedBanner}
              onEdit={openEditModal}
              onDelete={handleBannerDeleted}
              initialProducts={initialProducts}
            />
          </div>
        </div>

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <BannerFormModal
            editingBanner={editingBanner}
            onClose={closeModal}
            onSuccess={editingBanner ? handleBannerUpdated : handleBannerCreated}
          />
        )}
      </main>
    </div>
  )
}

