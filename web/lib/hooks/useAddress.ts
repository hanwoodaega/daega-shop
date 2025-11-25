import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

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
      // 기본 배송지 조회
      const { data: defaultAddr, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle()

      if (error || !defaultAddr) {
        // 기본 배송지가 없으면 첫 번째 배송지 조회
        const { data: firstAddr } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (firstAddr) {
          setAddress(firstAddr)
          setHasDefaultAddress(true)
        } else {
          setAddress(null)
          setHasDefaultAddress(false)
        }
      } else {
        setAddress(defaultAddr)
        setHasDefaultAddress(true)
      }
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
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAddresses(data)
      }
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
      const { data, error } = await supabase
        .from('users')
        .select('name, phone, email')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setProfile(data)
      }
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


