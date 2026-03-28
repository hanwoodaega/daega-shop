'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../supabase/supabase'
import { useCartStore, useWishlistStore } from '../store'
import { clearCartSyncFlag, setCartItems } from '../cart/cart-db'
import { setCartStorageUserId } from '../cart/cart-storage-key'
import { deriveAuthState } from './auth-state'
import { sendAuthTelemetry } from './auth-telemetry'

const ONBOARDING_AUTH_PATHS = [
  '/auth/login',
  '/auth/onboarding',
  '/auth/verify-phone',
  '/auth/restore',
  '/auth/signup/terms',
  '/auth/naver/callback',
  '/auth/kakao/callback',
  '/auth/callback',
  '/auth/find-id',
  '/auth/find-password',
  '/auth/signup',
]

const POST_LOGIN_FORCE_REDIRECT = ['/auth/onboarding', '/auth/verify-phone', '/auth/restore', '/auth/signup/terms']

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
  /** 세션당 cart/wishlist merge는 1회만. checkSession과 onAuthStateChange가 동시에 돌아가도 한 쪽만 보내도록 */
  const bootstrapCartSentRef = useRef(false)
  /** 동일 accessToken으로 bootstrap 중복 호출 방지 (in-flight promise 공유) */
  const bootstrapInFlightRef = useRef<Map<string, Promise<any>>>(new Map())
  /** includeSync=1 동기화는 로그인 후 백그라운드로 1회만 실행 */
  const deferredSyncInFlightRef = useRef<Map<string, Promise<void>>>(new Map())
  /** post-login finalize는 accessToken당 1회 */
  const finalizeInFlightRef = useRef<Map<string, Promise<void>>>(new Map())
  /** bootstrap 중복 호출 시 "가장 마지막에 시작한 응답"만 setCartItems/setUser 반영. 응답 순서 비결정성 제거 */
  const bootstrapCallIdRef = useRef(0)
  /** 적용한 bootstrap callId. hasSyncedRef(boolean)만 쓰면 먼저 도착한 응답이 true를 세워 최신 응답 적용이 막힘 → callId 비교로 "더 최신면 적용" */
  const lastAppliedBootstrapIdRef = useRef(0)
  const currentUserRef = useRef<User | null>(null)
  const initialGetUserTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const runDeferredSync = async (
    accessToken: string,
    userId: string,
    localCartItems: any[],
    localWishlistItems: any[]
  ) => {
    const existing = deferredSyncInFlightRef.current.get(accessToken)
    if (existing) {
      await existing
      return
    }

    const promise = (async () => {
      try {
        const res = await fetch('/api/auth/bootstrap?includeSync=1', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            cart: localCartItems,
            wishlist: localWishlistItems,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.authenticated === false) return
        if (currentUserRef.current?.id !== userId) return

        const cartItems = data?.sync?.cart?.items
        const wishlistItems = data?.sync?.wishlist?.items
        if (data?.sync?.cart?.done && Array.isArray(cartItems)) {
          setCartItems(cartItems, 'bootstrap')
        }
        if (data?.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
          useWishlistStore.setState({ items: wishlistItems })
        }
        hasSyncedRef.current = true
      } catch {
        // 동기화 실패는 로그인 성공을 막지 않음
      }
    })()

    deferredSyncInFlightRef.current.set(accessToken, promise)
    try {
      await promise
    } finally {
      globalThis.setTimeout(() => {
        deferredSyncInFlightRef.current.delete(accessToken)
      }, 2000)
    }
  }

  const runPostLoginBootstrap = async (
    session: { user?: User | null; access_token?: string | null },
    options?: { includeCartForMerge?: boolean }
  ) => {
    try {
      const accessToken = typeof session?.access_token === 'string' ? session.access_token : ''
      const isValidToken = accessToken.length > 10 && accessToken.includes('.')
      if (!isValidToken || !session?.user) {
        return { user: null, sync: null, onboarding: null }
      }

      const existing = bootstrapInFlightRef.current.get(accessToken)
      if (existing) {
        return await existing
      }

      const requestedMerge = options?.includeCartForMerge !== false
      const includeCartForMerge = requestedMerge && !bootstrapCartSentRef.current
      if (includeCartForMerge) bootstrapCartSentRef.current = true
      const localWishlistItems = includeCartForMerge ? useWishlistStore.getState().items : []
      const localCartItems =
        includeCartForMerge
          ? useCartStore.getState().items.filter((item) => item.id?.startsWith('cart-'))
          : []

      const promise = (async () => {
        const res = await fetch('/api/auth/bootstrap?includeSync=0', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          return { user: null, sync: null, onboarding: null }
        }

        const onboarding = data?.onboarding ?? null
        const state = deriveAuthState({
          authenticated: true,
          status: data?.user?.status ?? onboarding?.status ?? 'pending',
          requiresPhoneVerification: Boolean(onboarding?.requiresPhoneVerification),
          nameMissing: Boolean(onboarding?.nameMissing),
          termsRequired: Boolean(onboarding?.termsRequired),
        })

        return {
          user: state === 'ACTIVE' ? session.user : null,
          sync: null,
          onboarding,
          state,
        }
      })()

      bootstrapInFlightRef.current.set(accessToken, promise)
      try {
        const result = await promise
        if (includeCartForMerge && session.user?.id) {
          void runDeferredSync(accessToken, session.user.id, localCartItems, localWishlistItems)
        }
        return result
      } finally {
        // 짧은 시간 내 중복 호출만 막으면 충분 → 잠깐 유지 후 해제
        globalThis.setTimeout(() => {
          bootstrapInFlightRef.current.delete(accessToken)
        }, 2000)
      }
    } catch {
      return { user: null, sync: null, onboarding: null, state: 'LOGGED_OUT' as const }
    }
  }

  const shouldRedirectToOnboarding = (pathname: string | null) => {
    if (!pathname) return false
    return ONBOARDING_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  }

  const consumePostLoginNext = () => {
    if (typeof window === 'undefined') return null
    const value = sessionStorage.getItem('post_login_next')
    if (!value) return null
    sessionStorage.removeItem('post_login_next')
    return value
  }

  const consumePostLoginProvider = () => {
    if (typeof window === 'undefined') return 'unknown'
    const value = sessionStorage.getItem('post_login_provider')
    if (!value) return 'unknown'
    sessionStorage.removeItem('post_login_provider')
    return value as 'kakao' | 'naver' | 'google' | 'password' | 'unknown'
  }

  const runBackgroundFinalize = async (accessToken: string, nextPath: string, provider: 'kakao' | 'naver' | 'google' | 'password' | 'unknown') => {
    const existing = finalizeInFlightRef.current.get(accessToken)
    if (existing) {
      await existing
      return
    }

    const promise = (async () => {
      const startedAt = Date.now()
      try {
        const res = await fetch(`/api/auth/finalize?next=${encodeURIComponent(nextPath)}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        const redirectTo = typeof data?.redirectTo === 'string' ? data.redirectTo : '/'
        const currentPath = pathnameRef.current || '/'
        const shouldForce = POST_LOGIN_FORCE_REDIRECT.some((p) => redirectTo.startsWith(p))
        await sendAuthTelemetry({
          type: 'background_finalize',
          provider,
          success: true,
          redirect_to: redirectTo,
          duration_ms: Date.now() - startedAt,
        })
        if (shouldForce && redirectTo !== currentPath) {
          router.replace(redirectTo)
        }
      } catch {
        await sendAuthTelemetry({
          type: 'background_finalize',
          provider,
          success: false,
          duration_ms: Date.now() - startedAt,
        })
        // 실패해도 로그인 유지
      }
    })()

    finalizeInFlightRef.current.set(accessToken, promise)
    try {
      await promise
    } finally {
      globalThis.setTimeout(() => {
        finalizeInFlightRef.current.delete(accessToken)
      }, 2000)
    }
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
        setCartStorageUserId(null)
        setUser(null)
        currentUserRef.current = null
        setLoading(false)
      }
    }, 3000)
    
    // 서버 API로 세션 확인 (온보딩 상태까지 함께 확인)
    const checkSession = async () => {
      try {
        const myCallId = ++bootstrapCallIdRef.current
        const { data: localSession } = await supabase.auth.getSession()
        const session = localSession?.session
        const bootstrap = await runPostLoginBootstrap(
          { user: session?.user ?? null, access_token: session?.access_token ?? null },
          { includeCartForMerge: !hasSyncedRef.current }
        )
        
        if (initialGetUserTimeoutRef.current) {
          clearTimeout(initialGetUserTimeoutRef.current)
          initialGetUserTimeoutRef.current = null
        }
        
        if (!isMounted) return
        if (myCallId !== bootstrapCallIdRef.current) return

        const newUser = bootstrap.user ?? null
        currentUserRef.current = newUser
        setCartStorageUserId(newUser?.id ?? null)
        setUser(newUser)
        setLoading(false)

        if (newUser && bootstrap.sync && myCallId > lastAppliedBootstrapIdRef.current) {
          const cartItems = bootstrap.sync?.cart?.items
          const wishlistItems = bootstrap.sync?.wishlist?.items
          if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
            setCartItems(cartItems, 'bootstrap')
          }
          if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
            useWishlistStore.setState({ items: wishlistItems })
          }
          lastAppliedBootstrapIdRef.current = myCallId
          hasSyncedRef.current = true
        }
      } catch (error) {
        console.error('서버 API 세션 확인 예외:', error)
        if (isMounted && initialGetUserTimeoutRef.current) {
          clearTimeout(initialGetUserTimeoutRef.current)
          initialGetUserTimeoutRef.current = null
        }
        if (isMounted) {
          setCartStorageUserId(null)
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
          const myCallId = ++bootstrapCallIdRef.current
          const bootstrap = await runPostLoginBootstrap(
            { user: session?.user ?? null, access_token: session?.access_token ?? null },
            { includeCartForMerge: !hasSyncedRef.current }
          )
          if (myCallId !== bootstrapCallIdRef.current) return
          currentUserRef.current = bootstrap.user ?? null
          setCartStorageUserId(bootstrap.user?.id ?? null)
          setUser(bootstrap.user ?? null)
          setLoading(false)

          if (bootstrap.user && bootstrap.sync && myCallId > lastAppliedBootstrapIdRef.current) {
            const cartItems = bootstrap.sync?.cart?.items
            const wishlistItems = bootstrap.sync?.wishlist?.items
            if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
              setCartItems(cartItems, 'bootstrap')
            }
            if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
              useWishlistStore.setState({ items: wishlistItems })
            }
            lastAppliedBootstrapIdRef.current = myCallId
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

      // 토큰/프로필만 갱신되고 같은 유저·이미 동기화됐으면 bootstrap 스킵 → 서버 6회 호출 방지
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user?.id === currentUserRef.current?.id && hasSyncedRef.current) {
          setUser(session?.user ?? null)
          setLoading(false)
          return
        }
      }
      
      const myCallId = ++bootstrapCallIdRef.current
      const bootstrap = await runPostLoginBootstrap(
        { user: session?.user ?? null, access_token: session?.access_token ?? null },
        { includeCartForMerge: !hasSyncedRef.current }
      )
      if (myCallId !== bootstrapCallIdRef.current) return

      let newUser: User | null = bootstrap.user ?? null
      const prevUser = currentUserRef.current
      const wasLoggedOut = !!prevUser && !newUser
      const justLoggedIn = !prevUser && !!newUser
      
      currentUserRef.current = newUser
      setCartStorageUserId(newUser?.id ?? null)
      setUser(newUser)
      setLoading(false)

      if (newUser && bootstrap.sync && myCallId > lastAppliedBootstrapIdRef.current) {
        const cartItems = bootstrap.sync?.cart?.items
        const wishlistItems = bootstrap.sync?.wishlist?.items
        if (bootstrap.sync?.cart?.done && Array.isArray(cartItems)) {
          setCartItems(cartItems, 'bootstrap')
        }
        if (bootstrap.sync?.wishlist?.done && Array.isArray(wishlistItems)) {
          useWishlistStore.setState({ items: wishlistItems })
        }
        lastAppliedBootstrapIdRef.current = myCallId
        hasSyncedRef.current = true
      }
      
      if (justLoggedIn) {
        const accessToken = typeof session?.access_token === 'string' ? session.access_token : ''
        const nextPath = consumePostLoginNext() || '/'
        if (accessToken) {
          const provider = consumePostLoginProvider()
          void runBackgroundFinalize(accessToken, nextPath, provider)
        }
      }

      if (wasLoggedOut) {
        hasSyncedRef.current = false
        bootstrapCartSentRef.current = false
        lastAppliedBootstrapIdRef.current = 0
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
    setCartStorageUserId(null)
    setUser(null)
    setCartItems([], 'signOut')
    clearCartSyncFlag()
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

