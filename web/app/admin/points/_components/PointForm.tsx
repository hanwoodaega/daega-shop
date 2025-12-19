import { PointFormData, PointType, SelectedUserSummary } from '../_types'

interface PointFormProps {
  selectedUserSummaries: SelectedUserSummary[]
  formData: PointFormData
  isSubmitting: boolean
  onUpdateField: <K extends keyof PointFormData>(field: K, value: PointFormData[K]) => void
  onSubmit: () => Promise<boolean>
}

export default function PointForm({
  selectedUserSummaries,
  formData,
  isSubmitting,
  onUpdateField,
  onSubmit,
}: PointFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  const displayCount = 3
  const displayUsers = selectedUserSummaries.slice(0, displayCount)
  const remainingCount = selectedUserSummaries.length - displayCount

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">포인트 적립</h2>
      
      {/* 선택된 고객 미니 요약 */}
      {selectedUserSummaries.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-900 mb-2">선택 고객:</p>
          <div className="space-y-1">
            {displayUsers.map((user) => (
              <p key={user.id} className="text-sm text-blue-800">
                • {user.name} ({user.totalPoints.toLocaleString()}P)
              </p>
            ))}
            {remainingCount > 0 && (
              <p className="text-sm text-blue-600 font-medium">
                + {remainingCount}명 더...
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            선택된 고객
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-900 font-semibold">
              {selectedUserSummaries.length}명
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            적립 포인트 *
          </label>
          <input
            type="number"
            value={formData.points}
            onChange={(e) => onUpdateField('points', e.target.value)}
            min="1"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="포인트 입력"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            포인트 타입 *
          </label>
          <select
            value={formData.pointType}
            onChange={(e) => onUpdateField('pointType', e.target.value as PointType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="purchase">구매 적립</option>
            <option value="review">리뷰 적립</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            알림 제목 *
          </label>
          <input
            type="text"
            value={formData.notificationTitle}
            onChange={(e) => onUpdateField('notificationTitle', e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="예: 포인트 적립 완료"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            알림 내용 *
          </label>
          <textarea
            value={formData.notificationContent}
            onChange={(e) => onUpdateField('notificationContent', e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="예: 관리자가 포인트를 적립해주셨습니다."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || selectedUserSummaries.length === 0}
          className="w-full py-3 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '적립 중...' : '포인트 적립하기'}
        </button>
      </form>
    </div>
  )
}

