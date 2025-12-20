'use client'

interface RecommendationHeaderProps {
  onCreateClick: () => void
}

export default function RecommendationHeader({ onCreateClick }: RecommendationHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">맞춤별 추천 관리</h1>
        <p className="text-gray-600 mt-1">메인페이지 맞춤별 추천 카테고리와 상품을 관리하세요</p>
      </div>
      <button
        onClick={onCreateClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        + 카테고리 추가
      </button>
    </div>
  )
}

