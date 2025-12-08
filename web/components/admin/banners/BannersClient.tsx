'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BannerList, BannerDetail, BannerFormModal } from './index'
import type { Banner, Product } from './types'

export interface BannersClientProps {
  initialBanners: Banner[]
  initialProducts: Product[]
}

export default function BannersClient({ initialBanners, initialProducts }: BannersClientProps) {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>(initialBanners)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)

  const handleBannerCreated = () => {
    // 배너 목록 새로고침
    fetch('/api/admin/banners')
      .then(res => res.json())
      .then(data => {
        if (data.banners) {
          setBanners(data.banners)
        }
      })
    setShowCreateModal(false)
    setEditingBanner(null)
  }

  const handleBannerUpdated = () => {
    // 배너 목록 새로고침
    fetch('/api/admin/banners')
      .then(res => res.json())
      .then(data => {
        if (data.banners) {
          setBanners(data.banners)
          // 선택된 배너도 업데이트
          const updated = data.banners.find((b: Banner) => b.id === selectedBanner?.id)
          if (updated) {
            setSelectedBanner(updated)
          }
        }
      })
    setShowCreateModal(false)
    setEditingBanner(null)
  }

  const handleBannerDeleted = () => {
    // 배너 목록 새로고침
    fetch('/api/admin/banners')
      .then(res => res.json())
      .then(data => {
        if (data.banners) {
          setBanners(data.banners)
          setSelectedBanner(null)
        }
      })
  }

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner)
    setShowCreateModal(true)
  }

  const openCreateModal = () => {
    setEditingBanner(null)
    setShowCreateModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">배너 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 배너
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              관리자 홈
            </button>
          </div>
        </div>

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
            onClose={() => {
              setShowCreateModal(false)
              setEditingBanner(null)
            }}
            onSuccess={editingBanner ? handleBannerUpdated : handleBannerCreated}
          />
        )}
      </main>
    </div>
  )
}

