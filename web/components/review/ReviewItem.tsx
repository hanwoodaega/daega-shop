'use client'

import { useState, useEffect, memo } from 'react'
import ReviewStars from './ReviewStars'
import { formatDate } from '@/lib/utils'
import { ReviewItemProps } from '@/lib/types/review'

function ReviewItem({ review, isOwner = false, onEdit, onDelete }: ReviewItemProps) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 키보드 네비게이션
  useEffect(() => {
    if (!showImageModal || !review.images) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentImageIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentImageIndex(prev => Math.min(review.images!.length - 1, prev + 1))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowImageModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageModal, review.images])

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (showImageModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showImageModal])

  return (
    <div className="border-b border-gray-200 pt-5 pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1">
          <ReviewStars rating={review.rating} size="md" />
          <span className="text-sm font-medium text-gray-900">{review.user_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatDate(review.created_at)}
          </span>
          {isOwner && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit?.(review)}
                className="text-xs text-gray-600 hover:text-primary-800"
              >
                수정
              </button>
            </div>
          )}
        </div>
      </div>

      {review.images && review.images.length > 0 && (
        <div className="mb-3 overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-1 w-max">
            {review.images.map((image, index) => (
              <div key={index} className="w-[calc(25vw-1rem)] aspect-square bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <img 
                  src={image} 
                  alt={`리뷰 이미지 ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
                  onClick={() => {
                    setCurrentImageIndex(index)
                    setShowImageModal(true)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {review.title && (
        <h4 className="text-sm font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{review.content}</p>

      {/* 관리자 답변 */}
      {review.admin_reply && (
        <div className="mb-3 rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-500 mb-1">
            관리자 답변{review.admin_replied_at ? ` · ${formatDate(review.admin_replied_at)}` : ''}
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {review.admin_reply}
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {showImageModal && review.images && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setShowImageModal(false)}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
          >
            ×
          </button>

          {/* 이전 버튼 */}
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => Math.max(0, prev - 1))
              }}
              className="absolute left-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ‹
            </button>
          )}

          {/* 이미지 */}
          <img
            src={review.images[currentImageIndex]}
            alt={`리뷰 사진 ${currentImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 버튼 */}
          {currentImageIndex < review.images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => Math.min(review.images!.length - 1, prev + 1))
              }}
              className="absolute right-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ›
            </button>
          )}

          {/* 이미지 인덱스 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
            {currentImageIndex + 1} / {review.images.length}
          </div>
        </div>
      )}
    </div>
  )
}

// 최적화: React.memo를 사용하여 불필요한 리렌더링 방지
export default memo(ReviewItem, (prevProps, nextProps) => {
  // review 객체가 동일하고 isOwner가 동일하면 리렌더링 skip
  return (
    prevProps.review.id === nextProps.review.id &&
    prevProps.review.updated_at === nextProps.review.updated_at &&
    prevProps.isOwner === nextProps.isOwner
  )
})

