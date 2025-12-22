// 최근 본 상품 관리 (localStorage)
const RECENTLY_VIEWED_KEY = 'recentlyViewed'
const MAX_RECENT_ITEMS = 10

// 최근 본 상품 저장
export function saveRecentlyViewed(productId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const recent = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
    // 중복 제거하고 맨 앞에 추가, 최대 10개만 유지
    const updated = [productId, ...recent.filter((id: string) => id !== productId)].slice(0, MAX_RECENT_ITEMS)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('최근 본 상품 저장 실패:', error)
  }
}

// 최근 본 상품 목록 가져오기
export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
  } catch (error) {
    console.error('최근 본 상품 조회 실패:', error)
    return []
  }
}

// 최근 본 상품 초기화
export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENTLY_VIEWED_KEY)
}

