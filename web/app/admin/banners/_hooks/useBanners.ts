import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Banner } from '../_types'

export function useBanners(initialBanners: Banner[]) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/banners')
      const data = await res.json()
      if (res.ok && data.banners) {
        setBanners(data.banners)
        // 선택된 배너도 업데이트
        if (selectedBanner) {
          const updated = data.banners.find((b: Banner) => b.id === selectedBanner.id)
          if (updated) {
            setSelectedBanner(updated)
          } else {
            setSelectedBanner(null)
          }
        }
      }
    } catch (error) {
      console.error('배너 조회 실패:', error)
      toast.error('배너 조회에 실패했습니다')
    }
  }, [selectedBanner])

  const handleBannerCreated = useCallback(async () => {
    await fetchBanners()
    setShowCreateModal(false)
    setEditingBanner(null)
  }, [fetchBanners])

  const handleBannerUpdated = useCallback(async () => {
    await fetchBanners()
    setShowCreateModal(false)
    setEditingBanner(null)
  }, [fetchBanners])

  const handleBannerDeleted = useCallback(async () => {
    await fetchBanners()
    setSelectedBanner(null)
  }, [fetchBanners])

  const openEditModal = useCallback((banner: Banner) => {
    setEditingBanner(banner)
    setShowCreateModal(true)
  }, [])

  const openCreateModal = useCallback(() => {
    setEditingBanner(null)
    setShowCreateModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    setEditingBanner(null)
  }, [])

  return {
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
  }
}

