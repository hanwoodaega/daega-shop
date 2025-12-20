'use client'

import ReviewCard from './ReviewCard'
import type { AdminReview, ReviewStatus } from '../_types'

interface ReviewListProps {
  reviews: AdminReview[]
  status: ReviewStatus
  updatingId: string | null
  replyDrafts: Record<string, string>
  pointsDrafts: Record<string, string>
  getDefaultPoints: (reviewId: string) => number
  onReplyChange: (reviewId: string, text: string) => void
  onPointsChange: (reviewId: string, value: string) => void
  onPointsBlur: (reviewId: string) => void
  onSaveReply: (reviewId: string) => void
  onDeleteReply: (reviewId: string) => void
  onApprove: (reviewId: string, points: number) => void
  onReject: (reviewId: string) => void
  onDelete: (reviewId: string) => void
}

export default function ReviewList({
  reviews,
  status,
  updatingId,
  replyDrafts,
  pointsDrafts,
  getDefaultPoints,
  onReplyChange,
  onPointsChange,
  onPointsBlur,
  onSaveReply,
  onDeleteReply,
  onApprove,
  onReject,
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
          pointsDraft={pointsDrafts[review.id] ?? ''}
          defaultPoints={getDefaultPoints(review.id)}
          onReplyChange={(text) => onReplyChange(review.id, text)}
          onPointsChange={(value) => onPointsChange(review.id, value)}
          onPointsBlur={() => onPointsBlur(review.id)}
          onSaveReply={() => onSaveReply(review.id)}
          onDeleteReply={() => onDeleteReply(review.id)}
          onApprove={() => {
            // 포인트 계산은 상위에서 처리
            const str = (pointsDrafts[review.id] ?? '').trim()
            const parsed = str === '' ? NaN : parseInt(str, 10)
            const hasImages = (review.images || []).length > 0
            const fallback = hasImages ? 500 : 200
            const points = Number.isNaN(parsed) ? fallback : Math.max(0, parsed)
            onApprove(review.id, points)
          }}
          onReject={() => onReject(review.id)}
          onDelete={() => onDelete(review.id)}
        />
      ))}
    </div>
  )
}

