'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../supabase/supabase'
import { syncWishlistOnLogin } from '../wishlist/wishlist-db'
import { syncCartOnLogin } from '../cart/cart-db'

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
  const initialGetUserTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    
    let isMounted = true
    
    // 타임아웃 설정 (3초 후 강제로 loading 해제)
    initialGetUserTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        setUser(null)
        currentUserRef.current = null
        setLoading(false)
      }
    }, 3000)
    
    // 서버 API로 세션 확인
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        
        if (initialGetUserTimeoutRef.current) {
          clearTimeout(initialGetUserTimeoutRef.current)
          initialGetUserTimeoutRef.current = null
        }
        
        if (isMounted) {
          const newUser: User | null = data?.user ?? null
          currentUserRef.current = newUser
          setUser(newUser)
          setLoading(false)
          
          // 로그인 상태라면 DB에서 데이터 불러오기
          if (newUser && !hasSyncedRef.current) {
            hasSyncedRef.current = true
            const t = window.setTimeout(() => {
              syncWishlistOnLogin(newUser.id)
              syncCartOnLogin(newUser.id)
            }, 100)
            timeoutsRef.current.push(t)
          }
        }
      } catch (error) {
        console.error('서버 API 세션 확인 예외:', error)
        if (isMounted && initialGetUserTimeoutRef.current) {
          clearTimeout(initialGetUserTimeoutRef.current)
          initialGetUserTimeoutRef.current = null
        }
        if (isMounted) {
          setUser(null)
          currentUserRef.current = null
          setLoading(false)
        }
      }
    }
    
    checkSession()
    
    // 인증 상태 변경 감지 (로그인/로그아웃 이벤트만 처리)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return
      
      // INITIAL_SESSION은 무시 (서버 API로 이미 확인함)
      if (event === 'INITIAL_SESSION') {
        return
      }
      
      // 초기 타임아웃 정리
      if (initialGetUserTimeoutRef.current) {
        clearTimeout(initialGetUserTimeoutRef.current)
        initialGetUserTimeoutRef.current = null
      }
      
      // session에서 직접 사용자 정보 가져오기
      const newUser: User | null = session?.user ?? null
      
      const prevUser = currentUserRef.current
      const wasLoggedOut = !!prevUser && !newUser
      const justLoggedIn = !prevUser && !!newUser
      
      currentUserRef.current = newUser
      setUser(newUser)
      setLoading(false)

      // 로그인 시: localStorage → DB 마이그레이션 + DB에서 불러오기
      if (justLoggedIn && newUser && !hasSyncedRef.current) {
        hasSyncedRef.current = true
        const t = window.setTimeout(async () => {
          try {
            await syncWishlistOnLogin(newUser.id)
            await syncCartOnLogin(newUser.id)
          } catch (error) {
            // 마이그레이션 실패는 무시
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
      isMounted = false
      subscription.unsubscribe()
      // clear any pending timeouts
      if (initialGetUserTimeoutRef.current) {
        clearTimeout(initialGetUserTimeoutRef.current)
        initialGetUserTimeoutRef.current = null
      }
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

