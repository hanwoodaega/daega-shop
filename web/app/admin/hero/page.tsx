'use client'

import { useHeroSlides } from './_hooks/useHeroSlides'
import HeroList from './_components/HeroList'
import HeroModal from './_components/HeroModal'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function HeroManagementPage() {
  const {
    slides,
    loading,
    uploadingImage,
    showModal,
    editingSlide,
    openCreateModal,
    openEditModal,
    closeModal,
    handleImageUpload,
    handleSave,
    handleDelete,
  } = useHeroSlides()

  if (loading) {
    return (
      <AdminPageLayout title="히어로 이미지 관리">
        <div className="py-8 text-center">로딩 중...</div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout
      title="히어로 이미지 관리"
      description="메인페이지 히어로 섹션 이미지를 관리합니다"
      extra={
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 새 이미지 추가
        </button>
      }
    >
      <HeroList
        slides={slides}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <HeroModal
        isOpen={showModal}
        onClose={closeModal}
        editingSlide={editingSlide}
        onSave={handleSave}
        onImageUpload={handleImageUpload}
        uploadingImage={uploadingImage}
      />
    </AdminPageLayout>
  )
}
