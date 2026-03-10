'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { useAuth } from '@/lib/auth/auth-context'
import { defaultFetcher } from './fetcher'

export interface Address {
  id: string
  user_id: string
  name: string
  recipient_name: string
  recipient_phone: string
  zipcode?: string | null
  address: string
  address_detail?: string | null
  delivery_note?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

/**
 * 주소 목록 (배송지 관리, 결제 배송지 선택 등)
 */
export function useAddressesSWR() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ addresses: Address[] }>(
    user?.id ? '/api/addresses' : null,
    defaultFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
  return {
    addresses: data?.addresses ?? [],
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/**
 * 기본 배송지 (결제/장바구니)
 */
export function useDefaultAddressSWR(enabled = true) {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ address: Address | null; hasDefaultAddress: boolean }>(
    user?.id && enabled ? '/api/addresses/default' : null,
    defaultFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )
  return {
    address: data?.address ?? null,
    hasDefaultAddress: data?.hasDefaultAddress ?? false,
    error: error ?? null,
    isLoading,
    mutate,
  }
}

/** 주소 관련 API 호출 후 캐시 무효화 시 호출 */
export function mutateAddresses() {
  return Promise.all([
    globalMutate((key) => typeof key === 'string' && key === '/api/addresses'),
    globalMutate((key) => typeof key === 'string' && key === '/api/addresses/default'),
  ])
}
