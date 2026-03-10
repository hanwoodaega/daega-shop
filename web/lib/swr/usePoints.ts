'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'

export interface UserPoints {
  total_points: number
  purchase_count?: number
}

export interface PointsHistoryItem {
  id: string
  type: string
  description: string | null
  points: number
  created_at: string
}

export interface PointsPending {
  pendingPoints: number
  pendingCount: number
}

/**
 * 보유 포인트 (결제/포인트 페이지에서 사용)
 * 포커스 복귀 시 재검증: 다른 탭에서 결제/리뷰 등 후 돌아오면 최신 포인트 반영
 */
export function usePoints() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ userPoints: UserPoints }>(
    user?.id ? '/api/points' : null,
    defaultFetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  )
  return {
    totalPoints: data?.userPoints?.total_points ?? 0,
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/**
 * 포인트 내역 (포인트 페이지)
 */
export function usePointsHistory(limit = 50) {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ history: PointsHistoryItem[] }>(
    user?.id ? `/api/points/history?limit=${limit}` : null,
    defaultFetcher,
    { revalidateOnFocus: true, dedupingInterval: 8000 }
  )
  return {
    history: data?.history ?? [],
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/**
 * 적립 예정 포인트 (포인트 페이지)
 */
export function usePointsPending() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<PointsPending>(
    user?.id ? '/api/points/pending' : null,
    defaultFetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  )
  return {
    pendingPoints: data?.pendingPoints ?? 0,
    pendingCount: data?.pendingCount ?? 0,
    error: error ?? null,
    isLoading,
    mutate,
  }
}
