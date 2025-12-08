'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CollectionList, CollectionDetail, CollectionFormModal } from './index'
import type { Collection, Product } from './types'

interface CollectionsClientProps {
  initialCollections: Collection[]
  initialProducts: Product[]
  initialPromotedProductIds: string[] // 서버에서 배열로 전달 (Set은 직렬화 불가)
}

export default function CollectionsClient({
  initialCollections,
  initialProducts,
  initialPromotedProductIds,
}: CollectionsClientProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  // 서버에서 받은 배열을 Set으로 변환 (직렬화 문제 해결)
  const promotedProductIds = useMemo(
    () => new Set(initialPromotedProductIds),
    [initialPromotedProductIds]
  )

  // 컬렉션 목록 새로고침 함수 (중복 코드 제거)
  const refreshCollections = async () => {
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
  }

  const handleCollectionCreated = async () => {
    await refreshCollections()
    setShowCreateModal(false)
    setEditingCollection(null)
  }

  const handleCollectionUpdated = async () => {
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
  }

  const handleCollectionDeleted = async () => {
    await refreshCollections()
    setSelectedCollection(null)
  }

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection)
    setShowCreateModal(true)
  }

  const openCreateModal = () => {
    setEditingCollection(null)
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setEditingCollection(null)
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
            <h1 className="text-2xl font-bold text-gray-900">컬렉션 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 컬렉션
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
            onClose={() => {
              setShowCreateModal(false)
              resetForm()
            }}
            onSuccess={editingCollection ? handleCollectionUpdated : handleCollectionCreated}
          />
        )}
      </main>
    </div>
  )
}

