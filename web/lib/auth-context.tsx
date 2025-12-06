'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import { syncWishlistOnLogin } from './wishlist-db'
import { syncCartOnLogin } from './cart-db'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const hasSyncedRef = useRef(false)
  const currentUserRef = useRef<User | null>(null)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    // 현재 사용자 확인
    supabase.auth.getUser().then(({ data: { user }, error }: any) => {
      setUser(user ?? null)
      currentUserRef.current = user ?? null
      setLoading(false)
      
      // 로그인 상태라면 DB에서 데이터 불러오기
      if (user && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        const t = window.setTimeout(() => {
          syncWishlistOnLogin(user.id)
          syncCartOnLogin(user.id)
        }, 100)
        timeoutsRef.current.push(t)
      }
    })

    // 인증 상태 변경 감지
    // 주의: session 파라미터는 사용하지 않고 getUser()를 사용하여 보안 경고 방지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, _session: any) => {
      // getUser()를 사용하여 인증된 사용자 정보 가져오기 (보안상 안전)
      const { data: { user: newUser }, error } = await supabase.auth.getUser()
      const prevUser = currentUserRef.current
      const wasLoggedOut = !!prevUser && !newUser
      const justLoggedIn = !prevUser && !!newUser
      
      if (error) {
        console.error('사용자 인증 확인 실패:', error)
        currentUserRef.current = null
        setUser(null)
        return
      }
      
      currentUserRef.current = newUser
      setUser(newUser)

      // 로그인 시: localStorage → DB 마이그레이션 + DB에서 불러오기
      if (justLoggedIn && newUser && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        const t = window.setTimeout(async () => {
          try {
            await syncWishlistOnLogin(newUser.id)
            await syncCartOnLogin(newUser.id)
          } catch (error) {
            console.error('데이터 마이그레이션 실패:', error)
          }
        }, 100)
        timeoutsRef.current.push(t)
      }
      
      // 로그아웃 시: 동기화 플래그 리셋
      if (wasLoggedOut) {
        hasSyncedRef.current = false
      }
    })

    return () => {
      subscription.unsubscribe()
      // clear any pending timeouts
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

