import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/supabase'
import { useCartStore } from '@/lib/store'
import { loadCartFromDB } from '@/lib/cart/cart-db'

/**
 * 장바구니 실시간 동기화 Hook
 * Supabase Realtime을 통해 상품 가격/할인율 변경 시 장바구니를 자동 갱신
 */
export function useCartRealtimeSync(userId: string | undefined, productIdsString: string) {
  const channelRef = useRef<any>(null)
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadCart = async () => {
      const dbItems = await loadCartFromDB(userId)
      useCartStore.setState({ items: dbItems })
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
    
    // 초기 로드
    loadCart()
    
    // 페이지 포커스 시 갱신 (다른 탭에서 돌아올 때)
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
          (payload: any) => {
            // 상품 가격이나 할인율이 변경되면 장바구니 갱신
            if (payload.new.price !== payload.old?.price || 
                payload.new.discount_percent !== payload.old?.discount_percent) {
              scheduleLoadCart()
            }
          }
        )
        .subscribe()
      
      channelRef.current = channel
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

