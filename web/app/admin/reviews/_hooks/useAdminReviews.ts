'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { AdminReview, ReviewStatus, ReviewListResponse, ReviewFilters } from '../_types'
import { REVIEWS_PER_PAGE } from '../constants'

export function useAdminReviews() {
  const router = useRouter()
  const [status, setStatus] = useState<ReviewStatus>('pending')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ReviewFilters>({ date: '' })
  const [loading, setLoading] = useState(false)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status,
        page: page.toString(),
        limit: REVIEWS_PER_PAGE.toString(),
      })
      
      if (filters.date) {
        params.append('date', filters.date)
      }
      
      const res = await fetch(
        `/api/admin/reviews?${params.toString()}`,
        { cache: 'no-store' }
      )
      if (res.status === 401) {
        toast.error('관리자 로그인이 필요합니다.')
        router.replace('/admin/login')
        return
      }
      const data: ReviewListResponse = await res.json()
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('리뷰 조회 실패:', error)
      toast.error('리뷰 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [status, page, filters.date, router])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const changeStatus = useCallback(
    async (id: string, nextStatus: 'approved' | 'rejected') => {
      if (!confirm('리뷰를 승인하시겠습니까?')) return

      setUpdatingId(id)
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || '처리에 실패했습니다.')
          return false
        }

        toast.success('리뷰가 승인되었습니다')
        await fetchReviews()
        return true
      } catch (error) {
        console.error('리뷰 상태 변경 실패:', error)
        toast.error('리뷰 상태 변경에 실패했습니다')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [fetchReviews]
  )

  const deleteReview = useCallback(
    async (id: string) => {
      if (!confirm('리뷰를 삭제하시겠습니까?')) return

      setUpdatingId(id)
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error || '삭제에 실패했습니다.')
          return false
        }

        toast.success('리뷰가 삭제되었습니다')
        await fetchReviews()
        return true
      } catch (error) {
        console.error('리뷰 삭제 실패:', error)
        toast.error('리뷰 삭제에 실패했습니다')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [fetchReviews]
  )

  const handleStatusChange = useCallback((newStatus: ReviewStatus) => {
    setPage(1)
    setStatus(newStatus)
  }, [])

  const setFilter = useCallback(<K extends keyof ReviewFilters>(
    key: K,
    value: ReviewFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // 필터 변경 시 첫 페이지로
  }, [])

  return {
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
    refetch: fetchReviews,
  }
}

