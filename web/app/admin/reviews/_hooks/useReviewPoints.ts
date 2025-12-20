'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminReview } from '../_types'
import { DEFAULT_POINTS } from '../constants'

export function useReviewPoints(reviews: AdminReview[]) {
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({})
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})

  // 리뷰 목록이 변경될 때 기본 포인트 값 초기화
  useEffect(() => {
    const defaults: Record<string, number> = {}
    const draftDefaults: Record<string, string> = {}
    reviews.forEach((r) => {
      const hasImages = Array.isArray(r.images) && r.images.length > 0
      defaults[r.id] = hasImages ? DEFAULT_POINTS.WITH_IMAGES : DEFAULT_POINTS.TEXT_ONLY
      draftDefaults[r.id] = '' // 입력 전에는 비워둠 (0이 자동 표시되지 않도록)
    })
    setPointsMap(defaults)
    setPointsDrafts(draftDefaults)
  }, [reviews])

  const updatePointsDraft = useCallback((reviewId: string, value: string) => {
    const digits = value.replace(/[^0-9]/g, '')
    setPointsDrafts((prev) => ({ ...prev, [reviewId]: digits }))
  }, [])

  const finalizePoints = useCallback((reviewId: string) => {
    const raw = (pointsDrafts[reviewId] ?? '').trim()
    if (raw === '') return

    const parsed = parseInt(raw, 10) || 0
    setPointsMap((prev) => ({ ...prev, [reviewId]: Math.max(0, parsed) }))
  }, [pointsDrafts])

  const getPointsForReview = useCallback(
    (reviewId: string): number => {
      const str = (pointsDrafts[reviewId] ?? '').trim()
      const parsed = str === '' ? NaN : parseInt(str, 10)
      const hasImages = (reviews.find((r) => r.id === reviewId)?.images || []).length > 0
      const fallback = hasImages ? DEFAULT_POINTS.WITH_IMAGES : DEFAULT_POINTS.TEXT_ONLY
      return Number.isNaN(parsed) ? fallback : Math.max(0, parsed)
    },
    [pointsDrafts, reviews]
  )

  const getDefaultPoints = useCallback((reviewId: string): number => {
    const review = reviews.find((r) => r.id === reviewId)
    const hasImages = Array.isArray(review?.images) && (review?.images.length || 0) > 0
    return hasImages ? DEFAULT_POINTS.WITH_IMAGES : DEFAULT_POINTS.TEXT_ONLY
  }, [reviews])

  return {
    pointsDrafts,
    updatePointsDraft,
    finalizePoints,
    getPointsForReview,
    getDefaultPoints,
  }
}

