'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'

const UNREAD_COUNT_KEY = '/api/notifications/unread-count'

interface UnreadCountResponse {
  count?: number
}

/**
 * 읽지 않은 알림 개수 (헤더 배지)
 * revalidateOnFocus false, 필요 시 mutateUnreadCount()로만 갱신
 */
export function useUnreadCount() {
  const { user } = useAuth()
  const key = user?.id ? UNREAD_COUNT_KEY : null
  const { data, error, isLoading, mutate } = useSWR<UnreadCountResponse>(
    key,
    defaultFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
  return {
    unreadCount: typeof data?.count === 'number' ? data.count : 0,
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/** 알림 읽음 처리 직후 / 주문 생성 직후 등에서 호출 */
export function mutateUnreadCount() {
  return globalMutate(
    (k) => typeof k === 'string' && k === UNREAD_COUNT_KEY
  )
}
