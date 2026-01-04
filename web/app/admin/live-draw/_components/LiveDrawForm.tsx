'use client'

import type { LiveDrawWithEffectiveStatus, LiveDrawFormData, LiveDrawStatus } from '@/lib/livedraw/livedraw.types'

interface LiveDrawFormProps {
  liveDraw: LiveDrawWithEffectiveStatus | null
  formData: LiveDrawFormData
  onUpdateField: <K extends keyof LiveDrawFormData>(field: K, value: LiveDrawFormData[K]) => void
  onSubmit: () => Promise<void>
}

export default function LiveDrawForm({
  liveDraw,
  formData,
  onUpdateField,
  onSubmit,
}: LiveDrawFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  const statusOptions: { value: LiveDrawStatus | ''; label: string }[] = [
    { value: '', label: '자동 (날짜 기준)' },
    { value: 'upcoming', label: '예정' },
    { value: 'live', label: '라이브 중' },
    { value: 'ended', label: '종료' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-6">라이브 추첨 설정</h2>

      {liveDraw && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">현재 상태</div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-600">자동 계산 상태: </span>
              <span className="font-semibold">
                {liveDraw.status === 'upcoming' ? '예정' : liveDraw.status === 'live' ? '라이브 중' : '종료'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">실제 표시 상태: </span>
              <span className="font-semibold text-blue-600">
                {liveDraw.effective_status === 'upcoming' ? '예정' : liveDraw.effective_status === 'live' ? '라이브 중' : '종료'}
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            수동 상태 설정 <span className="text-gray-500 text-xs">(비워두면 자동 계산)</span>
          </label>
          <select
            value={formData.manual_status || ''}
            onChange={(e) => {
              const value = e.target.value
              onUpdateField('manual_status', value === '' ? null : (value as LiveDrawStatus))
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            수동 설정 시 자동 계산을 무시하고 이 상태를 우선 사용합니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            방송 일시 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.live_date}
            onChange={(e) => onUpdateField('live_date', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">제목</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onUpdateField('title', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="예: 1월 라이브 추첨"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">설명</label>
          <textarea
            value={formData.description}
            onChange={(e) => onUpdateField('description', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            placeholder="추첨 설명"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">유튜브 라이브 ID</label>
          <input
            type="text"
            value={formData.youtube_live_id}
            onChange={(e) => onUpdateField('youtube_live_id', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="예: dQw4w9WgXcQ"
          />
          <p className="mt-1 text-xs text-gray-500">
            유튜브 라이브 URL에서 v= 뒤의 ID를 입력하세요
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">유튜브 다시보기 ID</label>
          <input
            type="text"
            value={formData.youtube_replay_id}
            onChange={(e) => onUpdateField('youtube_replay_id', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="예: dQw4w9WgXcQ"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  )
}

