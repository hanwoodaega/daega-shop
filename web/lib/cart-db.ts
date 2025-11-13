// 장바구니 DB 직접 접근 (클라이언트)
import { supabase } from './supabase'
import { useCartStore, CartItem } from './store'
import toast from 'react-hot-toast'
import { debugLog } from './debug'

// DB에서 장바구니 불러오기
export async function loadCartFromDB(userId: string): Promise<CartItem[]> {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select(`
        id,
        product_id,
        quantity,
        promotion_type,
        promotion_group_id,
        discount_percent,
        products (
          id,
          name,
          price,
          image_url,
          brand,
          discount_percent,
          stock,
          promotion_type,
          promotion_products
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('장바구니 조회 실패:', error)
      return []
    }

    // localStorage 형식으로 변환 (상품의 최신 정보 우선 사용)
    const items = data?.map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      return {
        id: item.id,
        productId: item.product_id,
        name: product?.name || '',
        price: product?.price || 0, // 상품의 최신 가격 사용
        quantity: item.quantity,
        imageUrl: product?.image_url || '',
        discount_percent: product?.discount_percent ?? item.discount_percent, // 상품의 최신 할인율 우선
        brand: product?.brand,
        promotion_type: item.promotion_type as '1+1' | '2+1' | '3+1' | undefined,
        promotion_group_id: item.promotion_group_id,
        stock: product?.stock,
        selected: true
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

// 로그인 시 DB에서 불러와서 localStorage와 병합
export async function syncCartOnLogin(userId: string): Promise<void> {
  try {
    const localItems = useCartStore.getState().items
    const dbItems = await loadCartFromDB(userId)

    // localStorage에만 있는 항목들을 DB에 추가
    for (const item of localItems) {
      // DB에 이미 있는지 확인
      const existsInDB = dbItems.some(dbItem => 
        dbItem.productId === item.productId && 
        dbItem.promotion_group_id === item.promotion_group_id
      )

      if (!existsInDB) {
        await addToCartDB(userId, item)
      }
    }

    // DB 데이터로 전체 동기화
    const updatedItems = await loadCartFromDB(userId)
    useCartStore.setState({ items: updatedItems })

    // 동기화 알림 제거 (조용하게 동기화)
  } catch (error) {
    console.error('장바구니 동기화 실패:', error)
  }
}

// 장바구니 추가 (Optimistic Update + DB 저장)
export async function addCartItemWithDB(userId: string | null, item: CartItem): Promise<void> {
  // Optimistic update
  useCartStore.getState().addItem(item)

  // DB 저장 (로그인 시)
  if (userId) {
    const dbId = await addToCartDB(userId, item)
    
    if (dbId) {
      // DB ID로 업데이트
      const items = useCartStore.getState().items
      const lastItem = items[items.length - 1]
      if (lastItem && !lastItem.id?.startsWith('cart-')) {
        // 이미 DB ID를 가지고 있으면 건너뜀
      } else {
        // DB ID로 교체
        useCartStore.setState({
          items: items.map((i, idx) => 
            idx === items.length - 1 ? { ...i, id: dbId } : i
          )
        })
      }
    }
  }
}

// 장바구니 제거 (Optimistic Update + DB 삭제)
export async function removeCartItemWithDB(
  userId: string | null, 
  itemId: string, 
  promotionGroupId?: string
): Promise<void> {
  // Optimistic update
  useCartStore.getState().removeItem(itemId)

  // DB 삭제 (로그인 시, DB ID인 경우만)
  if (userId && itemId && !itemId.startsWith('cart-')) {
    const success = await removeFromCartDB(userId, itemId, promotionGroupId)
    if (!success) {
      console.error('DB 삭제 실패 (로컬은 이미 삭제됨)')
    }
  }
}

// 장바구니 수량 수정 (Optimistic Update + DB 수정)
export async function updateCartQuantityWithDB(
  userId: string | null,
  itemId: string,
  quantity: number
): Promise<void> {
  // Optimistic update
  useCartStore.getState().updateQuantity(itemId, quantity)

  // DB 수정 (로그인 시, DB ID인 경우만)
  if (userId && itemId && !itemId.startsWith('cart-')) {
    const success = await updateCartQuantityDB(userId, itemId, quantity)
    if (!success) {
      console.error('DB 수량 수정 실패 (로컬은 이미 수정됨)')
    }
  }
}


