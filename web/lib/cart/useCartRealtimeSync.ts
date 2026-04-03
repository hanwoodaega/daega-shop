import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/supabase'
import { useCartStore } from '@/lib/store'
import {
  getBootstrapCartSyncInFlight,
  getBootstrapHasSetCartThisSession,
  loadCartFromDB,
  registerAbortLoadCart,
  setCartItems,
  syncCartOnLogin,
} from '@/lib/cart/cart-db'
import { getCartStorageKey } from '@/lib/cart/cart-storage-key'

/**
 * 장바구니 실시간 동기화 Hook
 * - 비회원: localStorage 줄 + 상품 상세 API로 표시 갱신(가격·품절 등)
 * - 로그인: syncCartOnLogin 또는 bootstrap 이후 loadCartFromDB로 서버 장바구니 표시, 포커스 시 재조회
 */
export function useCartRealtimeSync(userId: string | undefined, productIdsString: string) {
  const channelRef = useRef<any>(null)
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncedUserIdRef = useRef<string | null>(null)
  const loadCartRequestIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    registerAbortLoadCart(() => {
      abortControllerRef.current?.abort()
    })

    const readCartFromStorage = () => {
      if (typeof window === 'undefined') return []
      const key = getCartStorageKey()
      const raw = window.localStorage.getItem(key)
      if (!raw) return []
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed?.state?.items) ? parsed.state.items : []
      } catch {
        return []
      }
    }

    // 비로그인: 장바구니 상품 최신 정보 반영 (포커스/visibility 시 API 호출 후 스토어 병합)
    // 삭제/품절 반영: API에 없는 상품(삭제됨) 제거, 있는 상품은 status(품절 등) 반영
    const refreshGuestCartDetails = async () => {
      const items = readCartFromStorage()
      if (!items?.length) return
      const productIds = Array.from(new Set(items.map((i: any) => i.productId).filter(Boolean)))
      if (productIds.length === 0) return
      try {
        const res = await fetch(`/api/cart/details?ids=${productIds.join(',')}`, { cache: 'no-store' })
        if (!res.ok) return
        const { details } = await res.json()
        if (!Array.isArray(details)) return
        const detailByProductId = new Map(details.map((d: any) => [d.productId, d]))
        const merged = items
          .filter((item: any) => {
            const d = detailByProductId.get(item.productId)
            return d && d.status !== 'deleted'
          })
          .map((item: any) => {
            const d = detailByProductId.get(item.productId)!
            return {
              ...item,
              name: d.name ?? item.name,
              price: d.price ?? item.price,
              slug: d.slug ?? item.slug,
              imageUrl: d.imageUrl ?? item.imageUrl,
              discount_percent: d.discount_percent ?? item.discount_percent,
              status: d.status ?? item.status,
              brand: d.brand ?? item.brand,
            }
          })
        setCartItems(merged, 'storageSync')
      } catch {
        // 무시
      }
    }

    if (!userId) {
      syncedUserIdRef.current = null
      const handleFocus = () => {
        const items = readCartFromStorage()
        if (items?.length) refreshGuestCartDetails()
        else if (items) setCartItems(items, 'storageSync')
      }
      const handlePageShow = () => {
        const items = readCartFromStorage()
        if (items?.length) refreshGuestCartDetails()
        else if (items) setCartItems(items, 'storageSync')
      }
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          const items = readCartFromStorage()
          if (items?.length) refreshGuestCartDetails()
          else if (items) setCartItems(items, 'storageSync')
        }
      }
      window.addEventListener('focus', handleFocus)
      window.addEventListener('pageshow', handlePageShow)
      document.addEventListener('visibilitychange', handleVisibility)
      // 마운트 시 한 번 갱신 (장바구니 페이지 진입 시 최신 정보 반영)
      if (readCartFromStorage().length > 0) refreshGuestCartDetails()

      const handleStorage = (event: StorageEvent) => {
        if (!event.key || event.storageArea !== window.localStorage) return
        if (event.key !== getCartStorageKey()) return
        const items = readCartFromStorage()
        if (items) setCartItems(items, 'storageSync')
      }
      window.addEventListener('storage', handleStorage)

      // 비로그인 Realtime: 장바구니 상품 정보 변경 시 즉시 반영 (회원과 동일)
      const guestProductIds = useCartStore.getState().items
        .map((item) => item.productId)
        .filter(Boolean)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (guestProductIds.length > 0) {
        const channelName = 'product-price-changes-guest'
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'products',
              filter: `id=in.(${guestProductIds.join(',')})`,
            },
            () => {
              refreshGuestCartDetails()
            }
          )
          .subscribe()
        channelRef.current = channel
      }

      return () => {
        window.removeEventListener('focus', handleFocus)
        window.removeEventListener('pageshow', handlePageShow)
        document.removeEventListener('visibilitychange', handleVisibility)
        window.removeEventListener('storage', handleStorage)
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
      }
    }

    const loadCart = async () => {
      abortControllerRef.current = new AbortController()
      const requestId = ++loadCartRequestIdRef.current
      try {
        const dbItems = await loadCartFromDB(userId, abortControllerRef.current.signal)
        if (requestId !== loadCartRequestIdRef.current) return
        setCartItems(dbItems, 'loadCart')
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        throw e
      }
    }

    const scheduleLoadCart = (delayMs: number = 200) => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
      reloadTimeoutRef.current = setTimeout(() => {
        reloadTimeoutRef.current = null
        loadCart()
      }, delayMs)
    }

    // 로그인 직후 첫 로드만 syncCartOnLogin.
    // 단, bootstrap이 이미 세팅했거나(in-session) 현재 includeSync=1 반영 중이면 건너뛴다.
    if (syncedUserIdRef.current !== userId) {
      syncedUserIdRef.current = userId
      if (!getBootstrapHasSetCartThisSession() && !getBootstrapCartSyncInFlight()) {
        abortControllerRef.current = new AbortController()
        syncCartOnLogin(userId, abortControllerRef.current.signal).catch(() => {})
      }
    }

    const handleFocus = () => {
      scheduleLoadCart(0)
    }
    window.addEventListener('focus', handleFocus)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleLoadCart(0)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handlePageShow = () => {
      scheduleLoadCart(0)
    }
    window.addEventListener('pageshow', handlePageShow)

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.storageArea !== window.localStorage) return
      const currentKey = getCartStorageKey()
      if (event.key !== currentKey) return
      const items = readCartFromStorage()
      if (items) setCartItems(items, 'storageSync')
    }
    window.addEventListener('storage', handleStorage)
    
    // Supabase Realtime 구독: 상품 가격/할인율 변경 시 장바구니 갱신
    // 최신 items를 스토어에서 가져오기 (클로저 문제 방지)
    const currentItems = useCartStore.getState().items
    const productIds = currentItems.map(item => item.productId).filter(Boolean)
    
    // 기존 channel이 있으면 먼저 제거 (중복 구독 방지)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    
    if (productIds.length > 0) {
      const channelName = `product-price-changes-${userId}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'products',
            filter: `id=in.(${productIds.join(',')})`
          },
          () => {
            // 상품 정보/가격/할인/프로모션 등이 변경되면 장바구니 갱신
            scheduleLoadCart()
          }
        )
        .subscribe()
      
      channelRef.current = channel
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('storage', handleStorage)
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
        reloadTimeoutRef.current = null
      }
      // cleanup: 기존 channel 제거
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, productIdsString])
}

