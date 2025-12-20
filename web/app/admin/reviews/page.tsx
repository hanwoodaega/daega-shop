'use client'

import { useEffect } from 'react'
import { useAdminReviews } from './_hooks/useAdminReviews'
import { useReviewReplies } from './_hooks/useReviewReplies'
import { useReviewPoints } from './_hooks/useReviewPoints'
import ReviewHeader from './_components/ReviewHeader'
import ReviewList from './_components/ReviewList'
import ReviewPagination from './_components/ReviewPagination'
import AdminPageLayout from '../_components/AdminPageLayout'

export default function AdminReviewsPage() {
  const {
    status,
    page,
    filters,
    loading,
    reviews,
    total,
    totalPages,
    updatingId,
    setPage,
    handleStatusChange,
    setFilter,
    changeStatus,
    deleteReview,
    refetch,
  } = useAdminReviews()

  const {
    replyDrafts,
    updatingId: replyUpdatingId,
    initializeReplies,
    updateReplyDraft,
    saveReply,
    deleteReply,
  } = useReviewReplies(reviews, refetch)

  const {
    pointsDrafts,
    updatePointsDraft,
    finalizePoints,
    getPointsForReview,
    getDefaultPoints,
  } = useReviewPoints(reviews)

  useEffect(() => {
    initializeReplies()
  }, [initializeReplies])

  const handleApprove = async (reviewId: string, points: number) => {
    await changeStatus(reviewId, 'approved', points)
  }

  const handleReject = async (reviewId: string) => {
    await changeStatus(reviewId, 'rejected')
  }

  const combinedUpdatingId = updatingId || replyUpdatingId

  return (
    <AdminPageLayout title="리뷰 관리">
      <ReviewHeader 
        status={status} 
        filters={filters}
        onStatusChange={handleStatusChange}
        onFilterChange={setFilter}
      />

      {loading ? (
        <div className="text-sm text-gray-500 py-8">불러오는 중...</div>
      ) : (
        <>
          <ReviewList
            reviews={reviews}
            status={status}
            updatingId={combinedUpdatingId}
            replyDrafts={replyDrafts}
            pointsDrafts={pointsDrafts}
            getDefaultPoints={getDefaultPoints}
            onReplyChange={updateReplyDraft}
            onPointsChange={updatePointsDraft}
            onPointsBlur={finalizePoints}
            onSaveReply={saveReply}
            onDeleteReply={deleteReply}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={deleteReview}
          />

          <ReviewPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </AdminPageLayout>
  )
}
