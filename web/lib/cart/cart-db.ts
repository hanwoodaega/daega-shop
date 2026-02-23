// 장바구니 서버 API 호출 (클라이언트)
import { useCartStore, CartItem } from '../store'
import toast from 'react-hot-toast'
import { debugLog } from '../utils/debug'

// 서버 API에서 장바구니 불러오기
export async function loadCartFromDB(userId: string): Promise<CartItem[]> {
  try {
    // 서버 API로 장바구니 조회
    const res = await fetch('/api/cart')
    
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
    
    debugLog.log('[loadCartFromDB] 서버 API에서 장바구니 로드 완료:', items.length)
    return items
  } catch (error) {
    console.error('장바구니 조회 에러:', error)
    return []
  }
}

// 서버 API로 장바구니에 추가
export async function addToCartDB(userId: string, item: CartItem): Promise<string | null> {
  debugLog.log('[addToCartDB] 시작:', { userId, item })
  
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
    debugLog.log('[addToCartDB] 장바구니 추가 성공:', data.data?.id)
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

// 서버 API로 장바구니에서 제거
export async function removeFromCartDB(userId: string, cartId: string, promotionGroupId?: string): Promise<boolean> {
  try {
    // 서버 API로 장바구니에서 제거
    const res = await fetch('/api/cart', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: cartId,
        promotion_group_id: promotionGroupId
      }),
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

/**
 * 로그인 시 장바구니 동기화
 * - localStorage의 항목을 DB에 병합
 * - DB의 최신 데이터로 전체 동기화
 */
export async function syncCartOnLogin(userId: string): Promise<void> {
  try {
    const localItems = useCartStore.getState().items
    const dbItems = await loadCartFromDB(userId)
    let hasAddedItems = false

    // localStorage에만 있는 항목들을 DB에 추가
    for (const item of localItems) {
      // DB에 이미 있는지 확인 (일반 상품은 productId만, 프로모션은 group_id도 확인)
      const existsInDB = dbItems.some(dbItem => 
        dbItem.productId === item.productId && 
        dbItem.promotion_group_id === item.promotion_group_id
      )

      if (!existsInDB) {
        await addToCartDB(userId, item)
        hasAddedItems = true
      }
    }

    // 항목이 추가되었을 때만 DB에서 다시 가져오기 (가격, 재고 등 최신 정보 반영)
    // 항목이 추가되지 않았다면 첫 번째 호출 결과를 그대로 사용
    if (hasAddedItems) {
      const updatedItems = await loadCartFromDB(userId)
      useCartStore.setState({ items: updatedItems })
    } else {
      // 추가되지 않았으면 첫 번째 호출 결과 사용
      useCartStore.setState({ items: dbItems })
    }
  } catch (error) {
    console.error('장바구니 동기화 실패:', error)
    // 동기화 실패해도 기존 localStorage 데이터는 유지
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
        toast.error('장바구니 추가에 실패했습니다.')
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 추가 실패:', error)
      toast.error('장바구니 추가에 실패했습니다.')
    }
  }
}

/**
 * 장바구니 제거 (Optimistic Update + DB 삭제)
 * - 즉시 UI 업데이트 후 DB에서 삭제
 * - 실패 시 자동 롤백
 */
export async function removeCartItemWithDB(
  userId: string | null, 
  itemId: string, 
  promotionGroupId?: string
): Promise<void> {
  const store = useCartStore.getState()
  const previousItems = store.items
  
  // 1. Optimistic update: 즉시 UI 업데이트
  store.removeItem(itemId)

  // 2. DB 삭제 (로그인 시, DB ID인 경우만)
  if (userId && itemId && !itemId.startsWith('cart-')) {
    try {
      const success = await removeFromCartDB(userId, itemId, promotionGroupId)
      if (!success) {
        // DB 삭제 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        toast.error('장바구니에서 제거하는데 실패했습니다.')
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 제거 실패:', error)
      toast.error('장바구니에서 제거하는데 실패했습니다.')
    }
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
        toast.error('수량 변경에 실패했습니다.')
      }
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 수량 수정 실패:', error)
      toast.error('수량 변경에 실패했습니다.')
    }
  }
}

/**
 * 서버 API로 장바구니 전체 비우기
 * - localStorage와 DB 모두에서 삭제
 */
export async function clearCartWithDB(userId: string | null): Promise<void> {
  const store = useCartStore.getState()
  const previousItems = store.items
  
  // 1. Optimistic update: 즉시 UI 업데이트
  store.clearCart()
  
  // 2. DB 삭제 (로그인 시)
  if (userId) {
    try {
      // 모든 장바구니 항목 삭제 (각 항목마다 DELETE 호출)
      // 또는 별도의 clear API를 만들 수도 있지만, 현재는 각 항목 삭제
      const itemsToDelete = previousItems.filter(item => item.id && !item.id.startsWith('cart-'))
      
      // 병렬로 모든 항목 삭제
      await Promise.all(
        itemsToDelete.map(item => 
          removeFromCartDB(userId, item.id!, item.promotion_group_id)
        )
      )
      
      toast.success('장바구니가 비워졌습니다.')
    } catch (error) {
      // 에러 발생 시 롤백
      useCartStore.setState({ items: previousItems })
      console.error('장바구니 비우기 에러:', error)
      toast.error('장바구니 비우기에 실패했습니다.')
    }
  } else {
    // 비로그인 사용자는 localStorage만 비우기
    toast.success('장바구니가 비워졌습니다.')
  }
}

