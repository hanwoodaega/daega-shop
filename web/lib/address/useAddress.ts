import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'

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
 * 기본 배송지를 불러오는 Hook
 */
export function useDefaultAddress(enabled: boolean = true) {
  const { user } = useAuth()
  const [address, setAddress] = useState<Address | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasDefaultAddress, setHasDefaultAddress] = useState(false)

  useEffect(() => {
    if (!user?.id || !enabled) {
      setLoading(false)
      return
    }

    loadDefaultAddress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, enabled])

  const loadDefaultAddress = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 서버 API로 기본 주소 조회
      const res = await fetch('/api/addresses/default')
      
      if (!res.ok) {
        throw new Error('기본 주소 조회 실패')
      }
      
      const data = await res.json()
      setAddress(data.address)
      setHasDefaultAddress(data.hasDefaultAddress)
    } catch (error) {
      console.error('배송지 조회 실패:', error)
      setAddress(null)
      setHasDefaultAddress(false)
    } finally {
      setLoading(false)
    }
  }

  return {
    address,
    loading,
    hasDefaultAddress,
    reload: loadDefaultAddress,
  }
}

/**
 * 모든 배송지를 불러오는 Hook
 */
export function useAddresses() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)

  const loadAddresses = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 서버 API로 주소 목록 조회
      const res = await fetch('/api/addresses')
      
      if (!res.ok) {
        throw new Error('주소 목록 조회 실패')
      }
      
      const data = await res.json()
      setAddresses(data.addresses || [])
    } catch (error) {
      console.error('배송지 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadAddresses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    addresses,
    loading,
    reload: loadAddresses,
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

