interface RecipientToolbarProps {
  searchQuery: string
  setSearchQuery: (val: string) => void
  onSelectAll: (checked: boolean) => void
}

export default function RecipientToolbar({
  searchQuery,
  setSearchQuery,
  onSelectAll
}: RecipientToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">수신자 선택</h2>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 가입방식, 전화번호 검색..."
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        />
        <button
          onClick={() => onSelectAll(true)}
          className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
        >
          전체선택
        </button>
        <button
          onClick={() => onSelectAll(false)}
          className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
        >
          선택해제
        </button>
      </div>
    </div>
  )
}

