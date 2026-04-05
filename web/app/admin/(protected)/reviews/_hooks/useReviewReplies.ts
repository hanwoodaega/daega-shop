'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import type { AdminReview } from '../_types'

export function useReviewReplies(reviews: AdminReview[], onRefetch: () => Promise<void>) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // 초기 답변값 설정
  const initializeReplies = useCallback(() => {
    const drafts: Record<string, string> = {}
    reviews.forEach((r) => {
      drafts[r.id] = r.admin_reply || ''
    })
    setReplyDrafts(drafts)
  }, [reviews])

  const updateReplyDraft = useCallback((reviewId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: text }))
  }, [])

  const saveReply = useCallback(
    async (id: string) => {
      const text = replyDrafts[id] ?? ''
      setUpdatingId(id)
      try {
        const res = await adminApiFetch(`/api/admin/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: text }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || '답변 저장에 실패했습니다.')
          return false
        }

        toast.success('답변이 저장되었습니다')
        await onRefetch()
        return true
      } catch (error) {
        console.error('답변 저장 실패:', error)
        toast.error('답변 저장에 실패했습니다')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [replyDrafts, onRefetch]
  )

  const deleteReply = useCallback(
    async (id: string) => {
      if (!confirm('관리자 답변을 삭제하시겠습니까?')) return

      setUpdatingId(id)
      try {
        const res = await adminApiFetch(`/api/admin/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteReply: true }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || '답변 삭제에 실패했습니다.')
          return false
        }

        toast.success('답변이 삭제되었습니다')
        await onRefetch()
        return true
      } catch (error) {
        console.error('답변 삭제 실패:', error)
        toast.error('답변 삭제에 실패했습니다')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [onRefetch]
  )

  return {
    replyDrafts,
    updatingId,
    initializeReplies,
    updateReplyDraft,
    saveReply,
    deleteReply,
  }
}

