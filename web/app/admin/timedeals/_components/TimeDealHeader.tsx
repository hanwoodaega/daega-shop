'use client'

interface TimeDealHeaderProps {
  onCreateClick: () => void
}

export default function TimeDealHeader({ onCreateClick }: TimeDealHeaderProps) {

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">타임딜 관리</h1>
      <div className="flex gap-2">
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          새 타임딜
        </button>
      </div>
    </div>
  )
}

