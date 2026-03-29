'use client'

import { ProductImage } from '../_types'

interface ImageItemProps {
  image: ProductImage
  index: number
  onDelete: (imageId: string) => void
  onPriorityChange: (imageId: string, newPriority: number) => void
  totalImages: number
}

export default function ImageItem({
  image,
  index,
  onDelete,
  onPriorityChange,
  totalImages,
}: ImageItemProps) {
  const isMain = image.priority === 0

  return (
    <div className="flex items-center gap-2 p-2 border rounded bg-white">
      {/* 이미지 */}
      <img
        src={image.image_url}
        alt={`상품 이미지 ${index + 1}`}
        className="w-16 h-16 object-cover rounded"
      />

      {/* 정보 및 버튼 */}
      <div className="flex-1">
        <div className="text-xs text-gray-600 mb-1">
          {isMain ? (
            <span className="text-green-600 font-semibold">메인 이미지 (우선순위: 0)</span>
          ) : (
            <>우선순위: {image.priority}</>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => {
              // 위로 이동: 현재 인덱스 - 1 위치의 이미지와 교환
              const targetIndex = Math.max(0, index - 1)
              onPriorityChange(image.id, targetIndex)
            }}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={index === 0}
            title="위로 이동"
          >
            ↑
          </button>
          <button
            onClick={() => {
              // 아래로 이동: 현재 인덱스 + 1 위치의 이미지와 교환
              const targetIndex = Math.min(totalImages - 1, index + 1)
              onPriorityChange(image.id, targetIndex)
            }}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={index >= totalImages - 1}
            title="아래로 이동"
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(image.id)}
            className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
            title="삭제"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

