'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'
import { UserCoupon } from '@/lib/supabase/supabase'

export interface CouponsResponse {
  coupons?: UserCoupon[]
  error?: string
}

/**
 * 사용자 쿠폰 목록 (보유/사용완료 탭에 따라)
 * 포커스 복귀 시 재검증: 다른 곳에서 쿠폰 사용 후 돌아오면 최신 반영
 */
export function useCoupons(includeUsed: boolean) {
  const { user } = useAuth()
  const key = user?.id ? `/api/coupons?includeUsed=${includeUsed}` : null
  const { data, error, isLoading, mutate } = useSWR<CouponsResponse>(
    key,
    defaultFetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  )
  return {
    coupons: data?.coupons ?? [],
    error: error ?? null,
    isLoading,
    mutate,
  }
}
