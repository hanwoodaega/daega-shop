'use client'

import ReviewCard from './ReviewCard'
import type { AdminReview, ReviewStatus } from '../_types'

interface ReviewListProps {
  reviews: AdminReview[]
  status: ReviewStatus
  updatingId: string | null
  replyDrafts: Record<string, string>
  onReplyChange: (reviewId: string, text: string) => void
  onSaveReply: (reviewId: string) => void
  onDeleteReply: (reviewId: string) => void
  onApprove: (reviewId: string) => void
  onDelete: (reviewId: string) => void
}

export default function ReviewList({
  reviews,
  status,
  updatingId,
  replyDrafts,
  onReplyChange,
  onSaveReply,
  onDeleteReply,
  onApprove,
  onDelete,
}: ReviewListProps) {
  if (reviews.length === 0) {
    return <div className="text-sm text-gray-500 py-8">표시할 리뷰가 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          status={status}
          updatingId={updatingId}
          replyDraft={replyDrafts[review.id] ?? (review.admin_reply || '')}
          onReplyChange={(text) => onReplyChange(review.id, text)}
          onSaveReply={() => onSaveReply(review.id)}
          onDeleteReply={() => onDeleteReply(review.id)}
          onApprove={() => onApprove(review.id)}
          onDelete={() => onDelete(review.id)}
        />
      ))}
    </div>
  )
}

