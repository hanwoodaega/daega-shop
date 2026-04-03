// 장바구니 서버 API 호출 (클라이언트)
import { useCartStore, CartItem } from '../store'
import { getCartStorageKey } from './cart-storage-key'
import toast from 'react-hot-toast'

// 서버 API에서 장바구니 불러오기 (캐시 금지: ?t= + cache: 'no-store' 필수)
// signal: 삭제 시 진행 중인 GET을 취소해 늦게 도착한 응답이 0을 덮어쓰지 않도록 함
export async function loadCartFromDB(userId: string, signal?: AbortSignal): Promise<CartItem[]> {
  try {
    const res = await fetch(`/api/cart?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'include',
      signal,
    })

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return []
      }
      console.error('장바구니 조회 실패:', res.status)
      return []
    }
    
    const data = await res.json()
    const apiItems = data.items || []
    
    // 기존 상태의 selected 값을 보존하기 위해 현재 스토어 상태 가져오기
    const currentItems = useCartStore.getState().items
    
    // selected 상태 보존
    const items = apiItems.map((item: CartItem) => {
      const existingItem = currentItems.find(i => i.id === item.id)
      return {
        ...item,
        selected: existingItem?.selected ?? true
      }
    })
    return items
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    console.error('장바구니 조회 에러:', error)
    return []
  }
}

// 서버 API로 장바구니에 추가
export async function addToCartDB(userId: string, item: CartItem): Promise<string | null> {
  try {
    // 서버 API로 장바구니 추가
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: item.productId,
        quantity: item.quantity,
        promotion_type: item.promotion_type,
        promotion_group_id: item.promotion_group_id,
        discount_percent: item.discount_percent
      }),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('[addToCartDB] 장바구니 추가 실패:', res.status, errorData)
      return null
    }
    
    const data = await res.json()
    return data.data?.id || null
  } catch (error) {
    console.error('[addToCartDB] 장바구니 추가 에러:', error)
    return null
  }
}

// 서버 API로 장바구니 수량 수정
export async function updateCartQuantityDB(userId: string, cartId: string, quantity: number): Promise<boolean> {
  try {
    // 서버 API로 장바구니 수량 수정
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: cartId,
        quantity
      }),
    })
    
    if (!res.ok) {
      console.error('장바구니 수량 수정 실패:', res.status)
      return false
    }
    
    return true
  } catch (error) {
    console.error('장바구니 수량 수정 에러:', error)
    return false
  }
}

// 서버 API로 장바구니에서 제거 (product_id로 삭제 시 같은 상품 중복 행 전부 삭제)
// DELETE 본문이 일부 환경에서 무시될 수 있어 URL 쿼리로 전달
export async function removeFromCartDB(
  userId: string,
  options: { cartId?: string; productId?: string; promotionGroupId?: string }
): Promise<boolean> {
  try {
    const params = new URLSearchParams()
    if (options.productId != null) {
      params.set('product_id', options.productId)
      if (options.promotionGroupId != null) params.set('promotion_group_id', options.promotionGroupId)
    } else if (options.cartId) {
      params.set('id', options.cartId)
      if (options.promotionGroupId != null) params.set('promotion_group_id', options.promotionGroupId)
    }
    const res = await fetch(`/api/cart?${params.toString()}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      console.error('장바구니 제거 실패:', res.status)
      return false
    }
    return true
  } catch (error) {
    console.error('장바구니 제거 에러:', error)
    return false
  }
}

const CART_LAST_SYNCED_USER_KEY = 'cart_last_synced_user_id'

/** 이번 세션에서 bootstrap이 이미 장바구니를 세팅했으면 true. syncCartOnLogin 건너뛸 때 사용 */
let bootstrapHasSetCartThisSession = false

/** 삭제/비우기 시작 시 진행 중인 GET 장바구니 요청을 취소하기 위한 콜백 (레이스 방지: 늦게 도착한 GET이 0을 덮어쓰지 않도록) */
let onAbortLoadCart: (() => void) | null = null
export function registerAbortLoadCart(fn: () => void): void {
  onAbortLoadCart = fn
}

export function getBootstrapHasSetCartThisSession(): boolean {
  return bootstrapHasSetCartThisSession
}

/** persist와 동일한 키·포맷({ state, version })으로 즉시 저장. store.ts cart persist의 version과 맞출 것. */
const CART_PERSIST_VERSION = 0

function flushCartPersist(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  try {
    const key = getCartStorageKey()
    const value = JSON.stringify({ state: { items }, version: CART_PERSIST_VERSION })
    window.localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/**
 * 스토어만 업데이트. 저장은 Zustand persist에만 맡김 (이중 저장 금지).
 */
export function setCartItems(items: CartItem[], source: string): void {
  if (source === 'bootstrap') bootstrapHasSetCartThisSession = true
  if (source === 'signOut') bootstrapHasSetCartThisSession = false
  useCartStore.setState({ items })
}

export function getCartLastSyncedUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CART_LAST_SYNCED_USER_KEY)
}

export function setCartLastSyncedUserId(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_LAST_SYNCED_USER_KEY, userId)
}

export function clearCartSyncFlag(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_LAST_SYNCED_USER_KEY)
}

/**
 * 로그인 후 서버 장바구니로 덮어쓰기만 수행. 로컬→DB 병합은 하지 않음(bootstrap 동일).
 * signal: 삭제 시 진행 중인 동기화 GET 취소용
 */
export async function syncCartOnLogin(userId: string, signal?: AbortSignal): Promise<void> {
  try {
    setCartLastSyncedUserId(userId)
    const items = await loadCartFromDB(userId, signal)
    setCartItems(items, 'syncCartOnLogin')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    console.error('장바구니 동기화 실패:', error)
  }
}

/**
 * 장바구니 추가 (Optimistic Update + DB 저장)
 * - 즉시 UI 업데이트 후 DB에 저장
 * - 실패 시 자동 롤백
 */
export async function addCartItemWithDB(userId: string | null, item: CartItem): Promise<void> {
  const store = useCartStore.getState()
  const previousItems = store.items
  
  // 1. Optimistic update: 즉시 UI 업데이트
  store.addItem(item)
  
  // 2. DB 저장 (로그인 시만)
  if (userId) {
    try {
      const dbId = await addToCartDB(userId, item)
      
      if (dbId) {
        // DB ID로 업데이트
        const currentItems = useCartStore.getState().items
        const lastItem = currentItems[currentItems.length - 1]
        
        // 임시 ID를 DB ID로 교체
        if (lastItem && lastItem.id?.startsWith('cart-')) {
          useCartStore.setState({
            items: currentItems.map((i, idx) => 
              idx === currentItems.length - 1 ? { ...i, id: dbId } : i
            )
          })
        }
      } else {
        // DB 저장 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        toast.error('장바구니 추가에 실패했습니다.', { duration: 3000 })
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 추가 실패:', error)
      toast.error('장바구니 추가에 실패했습니다.', { duration: 3000 })
    }
  }
}

/**
 * 장바구니 제거 (Optimistic Update + DB 삭제)
 * - productId로 삭제해 같은 상품 중복 행 전부 제거
 */
export async function removeCartItemWithDB(
  userId: string | null,
  itemId: string,
  promotionGroupId?: string,
  productId?: string
): Promise<void> {
  onAbortLoadCart?.()
  const store = useCartStore.getState()
  const previousItems = store.items
  const item = store.items.find((i) => i.id === itemId)
  const pid = productId ?? item?.productId

  store.removeItem(itemId)

  if (userId && pid) {
    try {
      const success = await removeFromCartDB(userId, {
        productId: pid,
        promotionGroupId: promotionGroupId ?? item?.promotion_group_id ?? undefined,
      })
      if (!success) {
        useCartStore.setState({ items: previousItems })
        toast.error('장바구니에서 제거하는데 실패했습니다.', { duration: 3000 })
      } else {
        const nextItems = useCartStore.getState().items
        setCartItems(nextItems, 'deleteSuccess')
        flushCartPersist(nextItems)
      }
    } catch (error) {
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 제거 실패:', error)
      toast.error('장바구니에서 제거하는데 실패했습니다.', { duration: 3000 })
    }
  } else {
    const nextItems = useCartStore.getState().items
    setCartItems(nextItems, 'deleteSuccess')
    flushCartPersist(nextItems)
  }
}

/**
 * 장바구니 수량 수정 (Optimistic Update + DB 수정)
 * - 즉시 UI 업데이트 후 DB에 반영
 * - 실패 시 자동 롤백
 */
export async function updateCartQuantityWithDB(
  userId: string | null,
  itemId: string,
  quantity: number
): Promise<void> {
  const store = useCartStore.getState()
  const previousItems = store.items
  
  // 1. Optimistic update: 즉시 UI 업데이트
  store.updateQuantity(itemId, quantity)

  // 2. DB 수정 (로그인 시, DB ID인 경우만)
  if (userId && itemId && !itemId.startsWith('cart-')) {
    try {
      const success = await updateCartQuantityDB(userId, itemId, quantity)
      if (!success) {
        // DB 수정 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        toast.error('수량 변경에 실패했습니다.', { duration: 3000 })
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 수량 수정 실패:', error)
      toast.error('수량 변경에 실패했습니다.', { duration: 3000 })
    }
  }
}

/**
 * 서버 API로 장바구니 전체 비우기
 * - localStorage와 DB 모두에서 삭제
 */
export async function clearCartWithDB(userId: string | null): Promise<void> {
  onAbortLoadCart?.()
  const store = useCartStore.getState()
  const previousItems = store.items

  // 1. Optimistic update: 즉시 UI 업데이트
  store.clearCart()
  
  // 2. DB 삭제 (로그인 시) - product_id 기준으로 삭제해 중복 행 전부 제거
  if (userId) {
    try {
      const byKey = new Map<string, { productId: string; promotionGroupId?: string }>()
      for (const item of previousItems) {
        if (!item.productId) continue
        const key = `${item.productId}::${item.promotion_group_id ?? ''}`
        if (!byKey.has(key)) byKey.set(key, { productId: item.productId, promotionGroupId: item.promotion_group_id })
      }
      await Promise.all(
        Array.from(byKey.values()).map(({ productId, promotionGroupId }) =>
          removeFromCartDB(userId, { productId, promotionGroupId })
        )
      )
      const nextItems = useCartStore.getState().items
      setCartItems(nextItems, 'clearSuccess')
      flushCartPersist(nextItems)
      toast.success('장바구니가 비워졌습니다.', { duration: 2000 })
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 비우기 에러:', error)
      toast.error('장바구니 비우기에 실패했습니다.', { duration: 3000 })
    }
  } else {
    const nextItems = useCartStore.getState().items
    setCartItems(nextItems, 'clearSuccess')
    flushCartPersist(nextItems)
    toast.success('장바구니가 비워졌습니다.', { duration: 2000 })
  }
}

