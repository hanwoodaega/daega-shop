'use client'

interface RecommendationHeaderProps {
  onCreateClick: () => void
}

export default function RecommendationHeader({ onCreateClick }: RecommendationHeaderProps) {
  return (
    <div className="flex items-center justify-end mb-6">
      <button
        onClick={onCreateClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        + 카테고리 추가
      </button>
    </div>
  )
}

