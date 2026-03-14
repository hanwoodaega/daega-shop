'use client'

import type { RecommendationCategory } from '../_types'

interface RecommendationCategoryListProps {
  categories: RecommendationCategory[]
  selectedCategory: RecommendationCategory | null
  onSelectCategory: (category: RecommendationCategory) => void
}

export default function RecommendationCategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
}: RecommendationCategoryListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="font-semibold mb-4">카테고리 목록</h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => onSelectCategory(category)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              selectedCategory?.id === category.id
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-gray-500 mt-1">순서: {category.sort_order}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

