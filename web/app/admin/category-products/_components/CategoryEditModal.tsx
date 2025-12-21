'use client'

import { useState, useEffect } from 'react'
import type { Category } from '../_types'

interface CategoryEditModalProps {
  category: Category
  onClose: () => void
  onSave: (title: string, description: string) => void
}

const typeLabels = {
  best: '베스트',
  sale: '특가',
  no9: '한우대가 NO.9',
}

export default function CategoryEditModal({
  category,
  onClose,
  onSave,
}: CategoryEditModalProps) {
  const [description, setDescription] = useState(category.description || '')

  useEffect(() => {
    setDescription(category.description || '')
  }, [category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 제목은 변경하지 않음 (고정값)
    const fixedTitle = typeLabels[category.type as 'best' | 'sale' | 'no9']
    onSave(fixedTitle, description)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">카테고리 정보 수정</h3>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:text-gray-200"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800">
              <strong>주의:</strong> 카테고리 제목은 변경할 수 없습니다. 각 카테고리는 고유한 페이지(/best, /sale, /no9)와 UI를 가지고 있으며, 제목은 해당 페이지에 하드코딩되어 있습니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리 타입 (변경 불가)
            </label>
            <input
              type="text"
              value={category.type}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              타입은 'best', 'sale', 'no9' 중 하나이며 변경할 수 없습니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 (변경 불가)
            </label>
            <input
              type="text"
              value={typeLabels[category.type as 'best' | 'sale' | 'no9']}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              제목은 각 페이지의 고유 UI에 하드코딩되어 있어 변경할 수 없습니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리자 메모 (설명)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="관리자용 메모 (선택사항, 프론트엔드에 표시되지 않음)"
            />
            <p className="text-xs text-gray-500 mt-1">
              이 설명은 관리자 페이지에서만 표시되며, 사용자에게는 보이지 않습니다.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

