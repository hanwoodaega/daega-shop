'use client'

import { useState } from 'react'
import { Product } from '@/lib/supabase/supabase'
import { ProductImage } from '../_hooks/useProductImages'

interface ProductImageGalleryProps {
  product: Product
  images: ProductImage[]
  selectedIndex: number
  onPrevious: () => void
  onNext: () => void
  onSwipe: (direction: 'left' | 'right') => void
}

export default function ProductImageGallery({
  product,
  images,
  selectedIndex,
  onPrevious,
  onNext,
  onSwipe,
}: ProductImageGalleryProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      onSwipe('left')
    }
    if (isRightSwipe) {
      onSwipe('right')
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const currentImage = images[selectedIndex] || (images.length > 0 ? images[0] : null)

  return (
    <div className="w-full aspect-square">
      <div
        className="w-full h-full bg-gray-200 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <img
            src={currentImage.image_url}
            alt={product.name}
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500 text-base">이미지 준비중</span>
          </div>
        )}
        
        {/* 이전 버튼 (여러 이미지가 있을 때만) */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrevious}
              disabled={selectedIndex === 0}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
              aria-label="이전 이미지"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 다음 버튼 */}
            <button
              onClick={onNext}
              disabled={selectedIndex === images.length - 1}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
              aria-label="다음 이미지"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* 이미지 인디케이터 (여러 이미지가 있을 때만 표시) */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {selectedIndex + 1}/{images.length}
          </div>
        )}
      </div>
    </div>
  )
}

