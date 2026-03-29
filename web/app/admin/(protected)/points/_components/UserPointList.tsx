import { User, UserPoints } from '../_types'

interface UserPointListProps {
  users: User[]
  userPoints: Record<string, UserPoints>
  selectedUsers: string[]
  onUserSelect: (userId: string) => void
  emptyMessage?: string
}

export default function UserPointList({
  users,
  userPoints,
  selectedUsers,
  onUserSelect,
  emptyMessage = '고객이 없습니다.',
}: UserPointListProps) {
  return (
    <div className="border border-gray-200 rounded-lg max-h-[600px] overflow-y-auto">
      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {users.map((user) => {
            const points = userPoints[user.id]
            return (
              <label
                key={user.id}
                className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => onUserSelect(user.id)}
                  className="w-4 h-4 text-primary-800 border-gray-300 rounded focus:ring-primary-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name || '이름 없음'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-900">
                        {points ? `${points.total_points.toLocaleString()}P` : '0P'}
                      </p>
                      <p className="text-xs text-gray-500">
                        구매 {points?.purchase_count || 0}회
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

