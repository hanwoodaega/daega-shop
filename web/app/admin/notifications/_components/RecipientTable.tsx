import { User } from '../_types'

interface RecipientTableProps {
  loading: boolean
  users: User[]
  selectedUserIds: Set<string>
  allSelected: boolean
  onToggleUser: (userId: string) => void
  onToggleAll: (checked: boolean) => void
}

export default function RecipientTable({
  loading,
  users,
  selectedUserIds,
  allSelected,
  onToggleUser,
  onToggleAll
}: RecipientTableProps) {
  if (loading) {
    return (
      <div className="border rounded-lg text-center text-gray-500 py-8">
        불러오는 중...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg text-center text-gray-500 py-8">
        사용자가 없습니다.
      </div>
    )
  }

  return (
    <div className="border rounded-lg max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="p-2 border text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <th className="p-2 border text-left">이메일</th>
            <th className="p-2 border text-left">이름</th>
            <th className="p-2 border text-left">전화번호</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr 
              key={user.id}
              className={`hover:bg-gray-50 cursor-pointer ${
                selectedUserIds.has(user.id) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onToggleUser(user.id)}
            >
              <td className="p-2 border">
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(user.id)}
                  onChange={() => onToggleUser(user.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="p-2 border">{user.email || '-'}</td>
              <td className="p-2 border">{user.name || '-'}</td>
              <td className="p-2 border">{user.phone || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

