'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../supabase/supabase'
import { useCartStore, useWishlistStore } from '../store'

const ONBOARDING_AUTH_PATHS = [
  '/auth/login',
  '/auth/onboarding',
  '/auth/verify-phone',
  '/auth/restore',
  '/auth/naver/callback',
  '/auth/kakao/callback',
  '/auth/callback',
  '/auth/find-id',
  '/auth/find-password',
  '/auth/signup',
]

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
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const hasSyncedRef = useRef(false)
  const currentUserRef = useRef<User | null>(null)
  const initialGetUserTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const runPostLoginBootstrap = async (session: { user?: User | null; access_token?: string | null }) => {
    try {
      const accessToken = typeof session?.access_token === 'string' ? session.access_token : ''
      const isValidToken = accessToken.length > 10 && accessToken.includes('.')
      if (!isValidToken || !session?.user) {
        return { user: null, sync: null, onboarding: null }
      }

      const localCartItems = useCartStore.getState().items
      const localWishlistItems = useWishlistStore.getState().items

      const res = await fetch('/api/auth/bootstrap?includeSync=1', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cart: localCartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            promotion_group_id: item.promotion_group_id,
            promotion_type: item.promotion_type,
            discount_percent: item.discount_percent,
          })),
          wishlist: localWishlistItems,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        return { user: null, sync: null, onboarding: null }
      }

      const onboarding = data?.onboarding ?? null
      const requiresPhoneVerification = Boolean(onboarding?.requiresPhoneVerification)
      const isActive = data?.user?.status === 'active'

      if (!isActive || requiresPhoneVerification) {
        return { user: null, sync: data?.sync ?? null, onboarding }
      }

      return { user: session.user, sync: data?.sync ?? null, onboarding }
    } catch {
      return { user: null, sync: null, onboarding: null }
    }
  }

  const shouldRedirectToOnboarding = (pathname: string | null) => {
    if (!pathname) return false
    return ONBOARDING_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  }

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
    
    // 서버 API로 세션 확인 (온보딩 상태까지 함께 확인)
    const checkSession = async () => {
      try {
        const { data: localSession } = await supabase.auth.getSession()
        const session = localSession?.session
        const bootstrap = await runPostLoginBootstrap({
          user: session?.user ?? null,
          access_token: session?.access_token ?? null,
        })
        
        if (initialGetUserTimeoutRef.current) {
          clearTimeout(initialGetUserTimeoutRef.current)
          initialGetUserTimeoutRef.current = null
        }
        
        if (isMounted) {
          const newUser = bootstrap.user ?? null

          currentUserRef.current = newUser
          setUser(newUser)
          setLoading(false)

          if (!newUser && bootstrap.onboarding?.requiresPhoneVerification && !shouldRedirectToOnboarding(pathnameRef.current)) {
            router.replace('/auth/login')
          }

          if (newUser && bootstrap.sync && !hasSyncedRef.current) {
            const cartItems = bootstrap.sync?.cart?.items
            const wishlistItems = bootstrap.sync?.wishlist?.items
            if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
              useCartStore.setState({ items: cartItems })
            }
            if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
              useWishlistStore.setState({ items: wishlistItems })
            }
            hasSyncedRef.current = true
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
    
    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return
      
      // INITIAL_SESSION: 서버 세션이 없더라도 로컬 세션이 있으면 반영
      if (event === 'INITIAL_SESSION') {
        if (!currentUserRef.current && session?.user) {
          const bootstrap = await runPostLoginBootstrap({
            user: session?.user ?? null,
            access_token: session?.access_token ?? null,
          })
          currentUserRef.current = bootstrap.user ?? null
          setUser(bootstrap.user ?? null)
          setLoading(false)

          if (!bootstrap.user && bootstrap.onboarding?.requiresPhoneVerification && !shouldRedirectToOnboarding(pathnameRef.current)) {
            router.replace('/auth/login')
          }

          if (bootstrap.user && bootstrap.sync && !hasSyncedRef.current) {
            const cartItems = bootstrap.sync?.cart?.items
            const wishlistItems = bootstrap.sync?.wishlist?.items
            if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
              useCartStore.setState({ items: cartItems })
            }
            if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
              useWishlistStore.setState({ items: wishlistItems })
            }
            hasSyncedRef.current = true
          }
        }
        return
      }
      
      // 초기 타임아웃 정리
      if (initialGetUserTimeoutRef.current) {
        clearTimeout(initialGetUserTimeoutRef.current)
        initialGetUserTimeoutRef.current = null
      }
      
      const bootstrap = await runPostLoginBootstrap({
        user: session?.user ?? null,
        access_token: session?.access_token ?? null,
      })
      let newUser: User | null = bootstrap.user ?? null
      
      const prevUser = currentUserRef.current
      const wasLoggedOut = !!prevUser && !newUser
      const justLoggedIn = !prevUser && !!newUser
      
      currentUserRef.current = newUser
      setUser(newUser)
      setLoading(false)

      if (!newUser && bootstrap.onboarding?.requiresPhoneVerification && !shouldRedirectToOnboarding(pathnameRef.current)) {
        router.replace('/auth/login')
      }

      if (justLoggedIn && newUser && bootstrap.sync && !hasSyncedRef.current) {
        const cartItems = bootstrap.sync?.cart?.items
        const wishlistItems = bootstrap.sync?.wishlist?.items
        if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
          useCartStore.setState({ items: cartItems })
        }
        if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
          useWishlistStore.setState({ items: wishlistItems })
        }
        hasSyncedRef.current = true
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

