// 위시리스트 DB 직접 접근 (클라이언트)
import { supabase } from './supabase'
import { useWishlistStore } from './store'
import toast from 'react-hot-toast'

// DB에서 위시리스트 불러오기
export async function loadWishlistFromDB(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', userId)

    if (error) {
      console.error('위시리스트 조회 실패:', error)
      return []
    }

    return data?.map(item => item.product_id) || []
  } catch (error) {
    console.error('위시리스트 조회 에러:', error)
    return []
  }
}

// 위시리스트에 추가 (DB + 로컬)
export async function addToWishlistDB(userId: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlists')
      .insert({
        user_id: userId,
        product_id: productId
      })

    if (error) {
      // 중복 에러는 무시
      if (error.code === '23505') {
        return true
      }
      console.error('위시리스트 추가 실패:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('위시리스트 추가 에러:', error)
    return false
  }
}

// 위시리스트에서 제거 (DB + 로컬)
export async function removeFromWishlistDB(userId: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (error) {
      console.error('위시리스트 제거 실패:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('위시리스트 제거 에러:', error)
    return false
  }
}

// 통합 토글 함수 (Optimistic Update)
export async function toggleWishlistDB(userId: string | null, productId: string): Promise<boolean> {
  const isInWishlist = useWishlistStore.getState().isInWishlist(productId)
  
  // Optimistic update
  if (isInWishlist) {
    useWishlistStore.getState().removeItem(productId)
  } else {
    useWishlistStore.getState().addItem(productId)
  }

  // DB 저장 (로그인 시)
  if (userId) {
    let success = false
    
    if (isInWishlist) {
      success = await removeFromWishlistDB(userId, productId)
    } else {
      success = await addToWishlistDB(userId, productId)
    }

    // 실패 시 롤백
    if (!success) {
      if (isInWishlist) {
        useWishlistStore.getState().addItem(productId)
      } else {
        useWishlistStore.getState().removeItem(productId)
      }
      return false
    }
  }

  return true
}

// 로그인 시 DB에서 불러와서 localStorage와 병합
export async function syncWishlistOnLogin(userId: string): Promise<void> {
  try {
    const localItems = useWishlistStore.getState().items
    const dbItems = await loadWishlistFromDB(userId)

    // localStorage에만 있는 항목들을 DB에 추가
    const itemsToAdd = localItems.filter(item => !dbItems.includes(item))
    
    for (const productId of itemsToAdd) {
      await addToWishlistDB(userId, productId)
    }

    // DB + localStorage 병합 (중복 제거)
    const mergedItems = Array.from(new Set([...dbItems, ...localItems]))
    useWishlistStore.setState({ items: mergedItems })

    // 동기화 알림 제거 (조용하게 동기화)
  } catch (error) {
    console.error('위시리스트 동기화 실패:', error)
  }
}

