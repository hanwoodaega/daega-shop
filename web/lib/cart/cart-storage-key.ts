/**
 * 장바구니 persist 스토리지 키: 게스트/로그인별 분리.
 * 게스트: cart-storage:guest
 * 로그인: cart-storage:${userId}
 *
 * 중요: rehydrate는 auth보다 먼저 돼서 currentUserId가 아직 null임.
 * 그때 guest를 읽으면 로그인 유저는 cart-storage:userId에 flush한 0을 못 읽고,
 * cart-storage:guest 옛 데이터가 복원되어 "삭제 후 새로고침해도 다시 찬다"가 발생.
 * → 마지막 사용 키를 CART_STORAGE_SUFFIX_KEY에 저장해, auth 전에도 같은 키로 읽도록 함.
 */
if (typeof window !== 'undefined') {
  window.localStorage.removeItem('cart-storage')
}

const CART_STORAGE_SUFFIX_KEY = 'cart-storage-suffix'

let currentUserId: string | null = null

export function setCartStorageUserId(userId: string | null): void {
  currentUserId = userId
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CART_STORAGE_SUFFIX_KEY, userId ?? 'guest')
  }
}

export function getCartStorageKey(): string {
  if (currentUserId !== null) return `cart-storage:${currentUserId}`
  if (typeof window !== 'undefined') {
    const suffix = window.localStorage.getItem(CART_STORAGE_SUFFIX_KEY)
    if (suffix) return `cart-storage:${suffix}`
  }
  return 'cart-storage:guest'
}
