// 장바구니 동기화 유틸리티
import { useCartStore, CartItem } from './store'

// DB에서 장바구니 불러오기
export async function syncCartFromDB(): Promise<void> {
  try {
    const response = await fetch('/api/cart')
    if (!response.ok) {
      if (response.status === 401) {
        // 로그인하지 않은 경우 - localStorage 사용
        return
      }
      throw new Error('장바구니 조회 실패')
    }

    const data = await response.json()
    if (data.success && data.items) {
      // DB 데이터로 스토어 덮어쓰기
      useCartStore.setState({ items: data.items })
    }
  } catch (error) {
    console.error('장바구니 동기화 실패:', error)
  }
}

// 장바구니에 상품 추가 (DB + 로컬)
export async function addToCart(item: CartItem, isLoggedIn: boolean): Promise<boolean> {
  // Optimistic update: 먼저 로컬에 추가
  useCartStore.getState().addItem(item)

  if (isLoggedIn) {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.productId,
          quantity: item.quantity,
          promotion_type: item.promotion_type,
          promotion_group_id: item.promotion_group_id,
          discount_percent: item.discount_percent
        })
      })

      if (!response.ok) {
        // 실패 시 롤백 (복잡하므로 전체 재동기화)
        await syncCartFromDB()
        return false
      }

      // 성공 시 DB에서 다시 불러오기 (ID 동기화 등)
      await syncCartFromDB()
      return true
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      // 실패 시 재동기화
      await syncCartFromDB()
      return false
    }
  }

  return true
}

// 장바구니 수량 수정 (DB + 로컬)
export async function updateCartQuantity(
  itemId: string, 
  quantity: number, 
  isLoggedIn: boolean
): Promise<boolean> {
  // Optimistic update: 먼저 로컬에서 수정
  const previousItems = useCartStore.getState().items
  useCartStore.getState().updateQuantity(itemId, quantity)

  if (isLoggedIn) {
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, quantity })
      })

      if (!response.ok) {
        // 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        return false
      }

      return true
    } catch (error) {
      console.error('장바구니 수량 수정 실패:', error)
      // 실패 시 롤백
      useCartStore.setState({ items: previousItems })
      return false
    }
  }

  return true
}

// 장바구니에서 상품 제거 (DB + 로컬)
export async function removeFromCart(
  itemId: string, 
  promotionGroupId: string | undefined,
  isLoggedIn: boolean
): Promise<boolean> {
  // Optimistic update: 먼저 로컬에서 제거
  const previousItems = useCartStore.getState().items
  useCartStore.getState().removeItem(itemId)

  if (isLoggedIn) {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: itemId,
          promotion_group_id: promotionGroupId 
        })
      })

      if (!response.ok) {
        // 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        return false
      }

      return true
    } catch (error) {
      console.error('장바구니 제거 실패:', error)
      // 실패 시 롤백
      useCartStore.setState({ items: previousItems })
      return false
    }
  }

  return true
}

// localStorage → DB 마이그레이션 (로그인 시 호출)
export async function migrateCartToDB(): Promise<void> {
  const localItems = useCartStore.getState().items

  if (localItems.length === 0) {
    return
  }

  try {
    // 먼저 DB에서 현재 장바구니 가져오기
    const response = await fetch('/api/cart')
    if (!response.ok) {
      throw new Error('장바구니 조회 실패')
    }

    const data = await response.json()
    const dbItems = data.items || []

    // localStorage에 있는 항목들을 DB에 추가
    // (중복 처리는 API에서 자동으로 수량 증가)
    for (const item of localItems) {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.productId,
          quantity: item.quantity,
          promotion_type: item.promotion_type,
          promotion_group_id: item.promotion_group_id,
          discount_percent: item.discount_percent
        })
      })
    }

    // 마이그레이션 완료 후 DB 데이터로 동기화
    await syncCartFromDB()
    
    // localStorage 비우기 (옵션)
    // useCartStore.getState().clearCart()
  } catch (error) {
    console.error('장바구니 마이그레이션 실패:', error)
  }
}


