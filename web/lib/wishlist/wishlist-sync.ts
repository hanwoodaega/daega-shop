// 위시리스트 동기화 유틸리티
import { useWishlistStore } from '../store'

// DB에서 위시리스트 불러오기
export async function syncWishlistFromDB(): Promise<void> {
  try {
    const response = await fetch('/api/wishlist')
    if (!response.ok) {
      if (response.status === 401) {
        // 로그인하지 않은 경우 - localStorage 사용
        return
      }
      throw new Error('위시리스트 조회 실패')
    }

    const data = await response.json()
    if (data.success && data.items) {
      // DB 데이터로 스토어 덮어쓰기
      useWishlistStore.setState({ items: data.items })
    }
  } catch (error) {
    console.error('위시리스트 동기화 실패:', error)
  }
}

// 위시리스트 항목 추가 (DB + 로컬)
export async function addToWishlist(productId: string, isLoggedIn: boolean): Promise<boolean> {
  // Optimistic update: 먼저 로컬에 추가
  useWishlistStore.getState().addItem(productId)

  if (isLoggedIn) {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('위시리스트 추가 실패 (상태 코드):', response.status, errorData)
        // 실패 시 롤백
        useWishlistStore.getState().removeItem(productId)
        return false
      }

      return true
    } catch (error) {
      console.error('위시리스트 추가 실패 (네트워크):', error)
      // 실패 시 롤백
      useWishlistStore.getState().removeItem(productId)
      return false
    }
  }

  return true
}

// 위시리스트 항목 제거 (DB + 로컬)
export async function removeFromWishlist(productId: string, isLoggedIn: boolean): Promise<boolean> {
  // Optimistic update: 먼저 로컬에서 제거
  const previousItems = useWishlistStore.getState().items
  useWishlistStore.getState().removeItem(productId)

  if (isLoggedIn) {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('위시리스트 제거 실패 (상태 코드):', response.status, errorData)
        // 실패 시 롤백
        useWishlistStore.setState({ items: previousItems })
        return false
      }

      return true
    } catch (error) {
      console.error('위시리스트 제거 실패 (네트워크):', error)
      // 실패 시 롤백
      useWishlistStore.setState({ items: previousItems })
      return false
    }
  }

  return true
}

// 토글 (추가/제거)
export async function toggleWishlist(productId: string, isLoggedIn: boolean): Promise<boolean> {
  const isInWishlist = useWishlistStore.getState().isInWishlist(productId)
  
  if (isInWishlist) {
    return await removeFromWishlist(productId, isLoggedIn)
  } else {
    return await addToWishlist(productId, isLoggedIn)
  }
}

// localStorage → DB 마이그레이션 (로그인 시 호출)
export async function migrateWishlistToDB(): Promise<void> {
  const localItems = useWishlistStore.getState().items

  if (localItems.length === 0) {
    return
  }

  try {
    // 먼저 DB에서 현재 위시리스트 가져오기
    const response = await fetch('/api/wishlist')
    if (!response.ok) {
      throw new Error('위시리스트 조회 실패')
    }

    const data = await response.json()
    const dbItems = data.items || []

    // localStorage에만 있는 항목들을 DB에 추가
    const itemsToAdd = localItems.filter(item => !dbItems.includes(item))

    for (const productId of itemsToAdd) {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      })
    }

    // 마이그레이션 완료 후 DB 데이터로 동기화
    await syncWishlistFromDB()
  } catch (error) {
    console.error('위시리스트 마이그레이션 실패:', error)
  }
}

