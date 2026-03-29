'use client'

import { useEffect } from 'react'
import { useAdminReviews } from './_hooks/useAdminReviews'
import { useReviewReplies } from './_hooks/useReviewReplies'
import ReviewHeader from './_components/ReviewHeader'
import ReviewList from './_components/ReviewList'
import ReviewPagination from './_components/ReviewPagination'
import AdminPageLayout from '@/app/admin/_components/AdminPageLayout'

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

  useEffect(() => {
    initializeReplies()
  }, [initializeReplies])

  const handleApprove = async (reviewId: string) => {
    await changeStatus(reviewId, 'approved')
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
            onReplyChange={updateReplyDraft}
            onSaveReply={saveReply}
            onDeleteReply={deleteReply}
            onApprove={handleApprove}
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
