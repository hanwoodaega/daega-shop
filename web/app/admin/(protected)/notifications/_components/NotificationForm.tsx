import { NotificationType } from '../_types'
import { NotificationFormData } from '../_types'

interface NotificationFormProps {
  formData: NotificationFormData
  onUpdateField: <K extends keyof NotificationFormData>(field: K, value: NotificationFormData[K]) => void
}

export default function NotificationForm({
  formData,
  onUpdateField
}: NotificationFormProps) {
  return (
    <div className="mb-8 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          제목 *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onUpdateField('title', e.target.value)}
          placeholder="알림 제목을 입력해주세요"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          내용 *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => onUpdateField('content', e.target.value)}
          placeholder="알림 내용을 입력해주세요"
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          알림 유형
        </label>
        <select
          value={formData.type}
          onChange={(e) => onUpdateField('type', e.target.value as NotificationType)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800"
        >
          <option value="general">일반</option>
          <option value="point">적립</option>
          <option value="review">리뷰</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          일반: 사용자 알림 화면 「일반」 탭에 표시 · 적립/리뷰: 「적립」 탭에 표시
        </p>
      </div>
    </div>
  )
}

