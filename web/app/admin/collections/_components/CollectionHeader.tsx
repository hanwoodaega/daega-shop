'use client'

interface CollectionHeaderProps {
  onCreateClick: () => void
}

export default function CollectionHeader({ onCreateClick }: CollectionHeaderProps) {

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">컬렉션 관리</h1>
      <div className="flex gap-2">
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          새 컬렉션
        </button>
      </div>
    </div>
  )
}

