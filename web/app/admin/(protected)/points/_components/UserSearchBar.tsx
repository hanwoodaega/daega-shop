interface UserSearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
}

export default function UserSearchBar({ searchTerm, onSearchChange }: UserSearchBarProps) {
  return (
    <div className="mb-4">
      <input
        type="text"
        placeholder="이메일, 이름, 전화번호로 검색..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  )
}

