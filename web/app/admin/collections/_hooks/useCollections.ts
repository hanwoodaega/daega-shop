import { useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Collection } from '../_types'

export function useCollections(initialCollections: Collection[], initialPromotedProductIds: string[]) {
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  // 서버에서 받은 배열을 Set으로 변환 (직렬화 문제 해결)
  const promotedProductIds = useMemo(
    () => new Set(initialPromotedProductIds),
    [initialPromotedProductIds]
  )

  // 컬렉션 목록 새로고침 함수
  const refreshCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/collections')
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      
      if (data.collections) {
        setCollections(data.collections)
        return data.collections
      }
      
      return null
    } catch (error) {
      console.error('컬렉션 목록 조회 실패:', error)
      toast.error('컬렉션 목록을 불러오지 못했습니다')
      return null
    }
  }, [])

  const handleCollectionCreated = useCallback(async () => {
    await refreshCollections()
    setShowCreateModal(false)
    setEditingCollection(null)
  }, [refreshCollections])

  const handleCollectionUpdated = useCallback(async () => {
    const updatedCollections = await refreshCollections()
    
    // 선택된 컬렉션도 업데이트
    if (updatedCollections && selectedCollection) {
      const updated = updatedCollections.find((c: Collection) => c.id === selectedCollection.id)
      if (updated) {
        setSelectedCollection(updated)
      }
    }
    
    setShowCreateModal(false)
    setEditingCollection(null)
  }, [refreshCollections, selectedCollection])

  const handleCollectionDeleted = useCallback(async () => {
    await refreshCollections()
    setSelectedCollection(null)
  }, [refreshCollections])

  const openEditModal = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setShowCreateModal(true)
  }, [])

  const openCreateModal = useCallback(() => {
    setEditingCollection(null)
    setShowCreateModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    setEditingCollection(null)
  }, [])

  return {
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
  }
}

