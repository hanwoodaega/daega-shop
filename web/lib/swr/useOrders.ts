'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'
import type { OrderWithItems } from '@/lib/order/order-types'

interface OrdersResponse {
  orders?: OrderWithItems[]
}

/**
 * 주문 목록 (프로필/주문 페이지)
 * deduping으로 동일 key 요청 중복 방지, 기간 변경 시에만 재요청
 */
export function useOrdersSWR(months: number) {
  const { user } = useAuth()
  const key = user?.id ? `/api/orders?months=${months}` : null
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    key,
    defaultFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
  return {
    orders: data?.orders ?? [],
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/** 주문 생성/취소/구매확정 직후 캐시 무효화 시 호출 */
export function mutateOrders() {
  return globalMutate(
    (key) => typeof key === 'string' && key.startsWith('/api/orders?')
  )
}
