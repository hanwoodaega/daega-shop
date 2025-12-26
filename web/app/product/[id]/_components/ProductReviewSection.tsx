'use client'

import ReviewList from '@/components/review/ReviewList'

interface ProductReviewSectionProps {
  productId: string
}

export default function ProductReviewSection({ productId }: ProductReviewSectionProps) {
  return (
    <div id="review-section" className="container mx-auto px-4 py-2">
      <ReviewList 
        productId={productId} 
        limit={3}
        showViewAllButton={true}
        onWriteReview={() => {
          // ReviewList 내부에서 직접 처리하므로 빈 함수
        }} 
      />
    </div>
  )
}

