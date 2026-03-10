import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import {
  useAddressesSWR,
  useDefaultAddressSWR,
  mutateAddresses,
  type Address as SwrAddress,
} from '@/lib/swr'

export type Address = SwrAddress

/**
 * 기본 배송지를 불러오는 Hook (SWR 캐시 사용)
 */
export function useDefaultAddress(enabled: boolean = true) {
  const { user } = useAuth()
  const { address, hasDefaultAddress, isLoading, mutate } = useDefaultAddressSWR(enabled && !!user?.id)
  return {
    address,
    loading: isLoading,
    hasDefaultAddress,
    reload: mutate,
  }
}

/**
 * 모든 배송지를 불러오는 Hook (SWR 캐시 사용)
 */
export function useAddresses() {
  const { user } = useAuth()
  const { addresses, isLoading, mutate } = useAddressesSWR()
  return {
    addresses: user?.id ? addresses : [],
    loading: isLoading,
    reload: mutate,
  }
}

/**
 * 사용자 정보를 불러오는 Hook
 */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<{
    name?: string
    phone?: string
    email?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 서버 API로 사용자 프로필 조회
      const res = await fetch('/api/user/profile')
      
      if (!res.ok) {
        throw new Error('사용자 정보 조회 실패')
      }
      
      const data = await res.json()
      setProfile(data.profile)
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    reload: loadProfile,
  }
}

