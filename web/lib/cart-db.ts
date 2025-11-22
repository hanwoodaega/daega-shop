// 장바구니 DB 직접 접근 (클라이언트)
import { supabase } from './supabase'
import { useCartStore, CartItem } from './store'
import toast from 'react-hot-toast'
import { debugLog } from './debug'
import { getDiscountPercent } from './promotion-utils'
import { extractPromotion, getPromotionTypeString } from './product-queries'

// DB에서 장바구니 불러오기
export async function loadCartFromDB(userId: string): Promise<CartItem[]> {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select(`
        id,
        product_id,
        quantity,
        promotion_group_id,
        discount_percent,
        products (
          id,
          slug,
          name,
          price,
          image_url,
          brand,
          promotion_products (
            promotion_id,
            promotions (
              id,
              type,
              buy_qty,
              discount_percent,
              is_active,
              start_at,
              end_at
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('장바구니 조회 실패:', error)
      return []
    }

    // localStorage 형식으로 변환 (상품의 최신 정보 우선 사용)
    // 기존 상태의 selected 값을 보존하기 위해 현재 스토어 상태 가져오기
    const currentItems = useCartStore.getState().items
    const items = data?.map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      
      // 프로모션 정보 추출
      const promotion = extractPromotion(product)
      
      // 할인율 결정 (프로모션 그룹 여부에 따라 우선순위 다름)
      const discountPercent = getDiscountPercent(
        item.discount_percent,
        promotion?.discount_percent,
        !!item.promotion_group_id
      )
      
      // 프로모션 타입 결정 (BOGO인 경우 buy_qty로부터 생성)
      const promotionType = getPromotionTypeString(promotion)
      
      // 기존 아이템의 selected 상태 보존 (없으면 true)
      const existingItem = currentItems.find(i => i.id === item.id)
      const selected = existingItem?.selected ?? true
      
      return {
        id: item.id,
        productId: item.product_id,
        slug: product?.slug || null,
        name: product?.name || '',
        price: product?.price || 0, // 상품의 최신 가격 사용
        quantity: item.quantity,
        imageUrl: product?.image_url || '',
        discount_percent: discountPercent,
        brand: product?.brand,
        promotion_type: promotionType,
        promotion_group_id: item.promotion_group_id,
        selected: selected
      }
    }) || []

    debugLog.log('[loadCartFromDB] 최신 상품 정보로 변환 완료:', items.length)
    return items
  } catch (error) {
    console.error('장바구니 조회 에러:', error)
    return []
  }
}

// 장바구니에 추가 (DB)
export async function addToCartDB(userId: string, item: CartItem): Promise<string | null> {
  debugLog.log('[addToCartDB] 시작:', { userId, item })
  
  try {
    // 프로모션 그룹이 있으면 항상 새로 추가
    if (item.promotion_group_id) {
      debugLog.log('[addToCartDB] 프로모션 상품 - 신규 추가')
      const { data, error } = await supabase
        .from('carts')
        .insert({
          user_id: userId,
          product_id: item.productId,
          quantity: item.quantity,
          promotion_type: item.promotion_type,
          promotion_group_id: item.promotion_group_id,
          discount_percent: item.discount_percent
        })
        .select()
        .single()

      if (error) {
        console.error('[addToCartDB] 프로모션 상품 추가 실패:', error)
        return null
      }

      debugLog.log('[addToCartDB] 프로모션 상품 추가 성공:', data.id)
      return data.id
    }

    // 일반 상품: 기존 상품 확인
    debugLog.log('[addToCartDB] 일반 상품 - 기존 상품 확인 중')
    const { data: existing, error: checkError } = await supabase
      .from('carts')
      .select('id, quantity, discount_percent')
      .eq('user_id', userId)
      .eq('product_id', item.productId)
      .is('promotion_group_id', null)
      .maybeSingle() // single() 대신 maybeSingle() 사용 (없어도 에러 안 남)
    
    // 406 에러 등 발생 시 로그
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[addToCartDB] 장바구니 확인 실패:', checkError)
    }

    if (existing) {
      // 수량 증가
      debugLog.log('[addToCartDB] 기존 상품 있음 - 수량 증가:', existing.id)
      const { data, error } = await supabase
        .from('carts')
        .update({ 
          quantity: existing.quantity + item.quantity,
          discount_percent: item.discount_percent ?? existing.discount_percent
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[addToCartDB] 장바구니 수량 업데이트 실패:', error)
        return null
      }

      debugLog.log('[addToCartDB] 수량 업데이트 성공:', data.id)
      return data.id
    }

    // 새 상품 추가
    debugLog.log('[addToCartDB] 신규 상품 추가')
    const { data, error } = await supabase
      .from('carts')
      .insert({
        user_id: userId,
        product_id: item.productId,
        quantity: item.quantity,
        discount_percent: item.discount_percent
      })
      .select()
      .single()

    if (error) {
      console.error('[addToCartDB] 장바구니 추가 실패:', error)
      return null
    }

    debugLog.log('[addToCartDB] 신규 상품 추가 성공:', data.id)
    return data.id
  } catch (error) {
    console.error('[addToCartDB] 장바구니 추가 에러:', error)
    return null
  }
}

// 장바구니 수량 수정 (DB)
export async function updateCartQuantityDB(userId: string, cartId: string, quantity: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('carts')
      .update({ quantity })
      .eq('id', cartId)
      .eq('user_id', userId)

    if (error) {
      console.error('장바구니 수량 수정 실패:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('장바구니 수량 수정 에러:', error)
    return false
  }
}

// 장바구니에서 제거 (DB)
export async function removeFromCartDB(userId: string, cartId: string, promotionGroupId?: string): Promise<boolean> {
  try {
    if (promotionGroupId) {
      // 프로모션 그룹 전체 삭제
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId)
        .eq('promotion_group_id', promotionGroupId)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return false
      }
    } else {
      // 개별 상품 삭제
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('id', cartId)
        .eq('user_id', userId)

      if (error) {
        console.error('장바구니 제거 실패:', error)
        return false
      }
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

    // localStorage에만 있는 항목들을 DB에 추가
    for (const item of localItems) {
      // DB에 이미 있는지 확인 (일반 상품은 productId만, 프로모션은 group_id도 확인)
      const existsInDB = dbItems.some(dbItem => 
        dbItem.productId === item.productId && 
        dbItem.promotion_group_id === item.promotion_group_id
      )

      if (!existsInDB) {
        await addToCartDB(userId, item)
      }
    }

    // DB의 최신 데이터로 전체 동기화 (가격, 재고 등 최신 정보 반영)
    const updatedItems = await loadCartFromDB(userId)
    useCartStore.setState({ items: updatedItems })
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
 * 장바구니 전체 비우기 (DB 삭제 포함)
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
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId)
      
      if (error) {
        // DB 삭제 실패 시 롤백
        useCartStore.setState({ items: previousItems })
        toast.error('장바구니 비우기에 실패했습니다.')
        console.error('장바구니 비우기 실패:', error)
      } else {
        toast.success('장바구니가 비워졌습니다.')
      }
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


