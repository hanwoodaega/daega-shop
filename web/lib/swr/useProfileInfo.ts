'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'

export interface ProfileInfo {
  name: string | null
  orders_count: number
  coupons_count: number
  points: number
  errors?: Record<string, string | null>
}

/**
 * 마이페이지 요약 정보 (이름, 주문/쿠폰/포인트 개수)
 * 로그인 시에만 요청, 캐시 공유로 레이아웃/헤더/프로필 페이지 중복 요청 방지
 */
export function useProfileInfo() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<ProfileInfo>(
    user?.id ? '/api/profile/info' : null,
    defaultFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 8000, // 8초: 프로필 계열은 페이지 이동이 잦아도 자주 치지 않도록
    }
  )
  return {
    data: data ?? null,
    error: error ?? null,
    isLoading,
    mutate,
  }
}
