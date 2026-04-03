import type { CartItem } from '@/lib/store'

/**
 * 비회원이 장바구니에서 「주문하기→로그인」할 때 선택 줄을 잠깐 담아 두는 sessionStorage 키.
 *
 * 제거 시점:
 * - `consumePendingGuestCheckout()` — 결제 페이지 첫 진입 시 1회 읽고 키 삭제
 * - `clearPendingGuestCheckout()` — 로그아웃, 로그인 화면에서 next가 /checkout이 아님, finalize 성공 후
 *   결제가 아닌 경로로 이동, finalize API 오류, 토스 결제 실패 페이지 진입
 */
export const PENDING_GUEST_CHECKOUT_KEY = 'pending_guest_checkout_cart'

/** 로그인 후 이동 경로가 결제인지 (finalize·로그인 페이지에서 pending 정리 여부 판단) */
export function isCheckoutRedirectPath(path: string | null | undefined): boolean {
  if (path == null || path === '') return false
  try {
    const pathname = path.startsWith('http')
      ? new URL(path).pathname
      : path.split('?')[0]
    return pathname === '/checkout' || pathname.startsWith('/checkout/')
  } catch {
    return false
  }
}

export function stashPendingGuestCheckout(items: CartItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return
  try {
    sessionStorage.setItem(PENDING_GUEST_CHECKOUT_KEY, JSON.stringify(items))
  } catch {
    // ignore quota / private mode
  }
}

/** stash만 제거 (소비 없음). 로그아웃·결제 취소·결제로 가지 않는 로그인 완료 등 */
export function clearPendingGuestCheckout(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_GUEST_CHECKOUT_KEY)
  } catch {
    // ignore
  }
}

/** 결제 페이지 진입 시 1회 소비. 없으면 null */
export function consumePendingGuestCheckout(): CartItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_GUEST_CHECKOUT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_GUEST_CHECKOUT_KEY)
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed as CartItem[]
  } catch {
    return null
  }
}
