// 위시리스트 서버 API 호출 (클라이언트)
import { useWishlistStore } from '../store'

// 서버 API로 위시리스트에 추가
export async function addToWishlistDB(userId: string, productId: string): Promise<boolean> {
  try {
    // 서버 API로 위시리스트 추가
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId }),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      // 중복 에러는 무시 (이미 찜한 상품)
      if (errorData.exists) {
        return true
      }
      console.error('위시리스트 추가 실패:', res.status, errorData)
      return false
    }
    
    return true
  } catch (error) {
    console.error('위시리스트 추가 에러:', error)
    return false
  }
}

// 서버 API로 위시리스트에서 제거
export async function removeFromWishlistDB(userId: string, productId: string): Promise<boolean> {
  try {
    // 서버 API로 위시리스트에서 제거
    const res = await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId }),
    })
    
    if (!res.ok) {
      console.error('위시리스트 제거 실패:', res.status)
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

