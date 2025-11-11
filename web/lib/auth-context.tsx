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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // 로그인 상태라면 DB에서 데이터 불러오기
      if (session?.user && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setTimeout(() => {
          syncWishlistOnLogin(session.user.id)
          syncCartOnLogin(session.user.id)
        }, 100)
      }
    })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      const wasLoggedOut = user && !newUser
      const justLoggedIn = !user && newUser
      
      setUser(newUser)

      // 로그인 시: localStorage → DB 마이그레이션 + DB에서 불러오기
      if (justLoggedIn && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        setTimeout(async () => {
          try {
            await syncWishlistOnLogin(newUser.id)
            await syncCartOnLogin(newUser.id)
          } catch (error) {
            console.error('데이터 마이그레이션 실패:', error)
          }
        }, 100)
      }
      
      // 로그아웃 시: 동기화 플래그 리셋
      if (wasLoggedOut) {
        hasSyncedRef.current = false
      }
    })

    return () => subscription.unsubscribe()
  }, [user])

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

