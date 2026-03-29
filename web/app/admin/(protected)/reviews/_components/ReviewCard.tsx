'use client'

import type { AdminReview, ReviewStatus } from '../_types'

interface ReviewCardProps {
  review: AdminReview
  status: ReviewStatus
  updatingId: string | null
  replyDraft: string
  onReplyChange: (text: string) => void
  onSaveReply: () => void
  onDeleteReply: () => void
  onApprove: () => void
  onDelete: () => void
}

export default function ReviewCard({
  review,
  status,
  updatingId,
  replyDraft,
  onReplyChange,
  onSaveReply,
  onDeleteReply,
  onApprove,
  onDelete,
}: ReviewCardProps) {
  const isUpdating = updatingId === review.id

  return (
    <div className="border rounded p-4">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-900 font-semibold truncate">
              {review.product?.name || '상품'}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(review.created_at).toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {review.user_name || review.user_id} · 별점 {review.rating}
          </div>
          {review.title && <div className="text-sm font-medium mt-2">{review.title}</div>}
          <div className="text-sm mt-1 whitespace-pre-wrap">{review.content}</div>
          {Array.isArray(review.images) && review.images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {review.images.slice(0, 5).map((img, idx) => (
                <div key={idx} className="w-16 h-16 rounded overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* 관리자 답변 */}
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600">
                관리자 답변{' '}
                {review.admin_replied_at
                  ? `· ${new Date(review.admin_replied_at).toLocaleString()}`
                  : ''}
              </div>
              {review.admin_reply && (
                <button
                  onClick={onDeleteReply}
                  disabled={isUpdating}
                  className="text-xs text-red-600 hover:underline disabled:opacity-60"
                >
                  삭제
                </button>
              )}
            </div>
            <textarea
              value={replyDraft}
              onChange={(e) => onReplyChange(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="관리자 답변을 입력해주세요"
            />
            <div className="mt-2 text-right">
              <button
                onClick={onSaveReply}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isUpdating ? '저장 중...' : '답변 저장'}
              </button>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-3 flex items-center gap-2">
            {status !== 'approved' && (
              <button
                onClick={onApprove}
                disabled={isUpdating}
                className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isUpdating ? '처리 중...' : '승인(전체 공개)'}
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

