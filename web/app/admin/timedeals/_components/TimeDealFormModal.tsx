'use client'

import type { TimeDeal, TimeDealFormData } from '../_types'

interface TimeDealFormModalProps {
  isOpen: boolean
  editingTimeDeal: TimeDeal | null
  formData: TimeDealFormData
  onClose: () => void
  onUpdateField: <K extends keyof TimeDealFormData>(field: K, value: TimeDealFormData[K]) => void
  onSubmit: () => Promise<boolean>
}

export default function TimeDealFormModal({
  isOpen,
  editingTimeDeal,
  formData,
  onClose,
  onUpdateField,
  onSubmit,
}: TimeDealFormModalProps) {
  if (!isOpen) return null

  const handleSubmit = async () => {
    await onSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingTimeDeal ? '타임딜 수정' : '새 타임딜 만들기'}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: 오늘만 특가!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => onUpdateField('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="타임딜 설명 (선택사항)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              시작 시간 <span className="text-gray-500 text-xs">(비워두면 현재 시간으로 설정)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_at}
              onChange={(e) => onUpdateField('start_at', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="비워두면 현재 시간으로 설정"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              종료 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.end_at}
              onChange={(e) => onUpdateField('end_at', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {editingTimeDeal ? '수정' : '생성'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

