'use client'

import type { RecommendationCategory, RecommendationFormData } from '../_types'

interface RecommendationFormModalProps {
  isOpen: boolean
  editingCategory: RecommendationCategory | null
  formData: RecommendationFormData
  onClose: () => void
  onUpdateField: <K extends keyof RecommendationFormData>(
    field: K,
    value: RecommendationFormData[K]
  ) => void
  onSubmit: () => Promise<boolean>
}

export default function RecommendationFormModal({
  isOpen,
  editingCategory,
  formData,
  onClose,
  onUpdateField,
  onSubmit,
}: RecommendationFormModalProps) {
  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingCategory ? '카테고리 수정' : '카테고리 추가'}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">카테고리 이름 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onUpdateField('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">순서</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => onUpdateField('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingCategory ? '수정' : '생성'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

