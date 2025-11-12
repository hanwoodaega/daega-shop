/**
 * 공통 유틸리티 함수
 */

/**
 * 숫자를 한국어 형식의 가격 문자열로 변환
 * @param price 가격
 * @returns 포맷된 가격 문자열 (예: "1,234,567")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price)
}

/**
 * 날짜를 한국어 형식으로 변환
 * @param dateString 날짜 문자열
 * @returns 포맷된 날짜 문자열 (예: "2024.11.12")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 프로모션 타입에 따른 필요 개수 반환
 */
export function getPromotionRequiredCount(promotionType: string | null | undefined): number {
  if (promotionType === '3+1') return 4
  if (promotionType === '2+1') return 3
  return 2
}

/**
 * 프로모션 타입에 따른 유료 개수 반환
 */
export function getPromotionPaidCount(promotionType: string | null | undefined): number {
  if (promotionType === '3+1') return 3
  if (promotionType === '2+1') return 2
  return 1
}

/**
 * 할인가 계산
 */
export function calculateDiscountedPrice(price: number, discountPercent?: number | null): number {
  if (!discountPercent || discountPercent <= 0) return price
  return Math.round(price * (100 - discountPercent) / 100)
}

/**
 * 프로모션 수량 총합 계산
 */
export function getTotalPromoQuantity(quantities: {[key: string]: number}): number {
  return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
}

/**
 * 스크롤 이벤트 핸들러 생성 (상단으로 스크롤 버튼 표시용)
 */
export function createScrollToTopHandler(
  threshold: number = 300,
  setShowScrollTop: (show: boolean) => void
): () => void {
  return () => {
    if (window.scrollY > threshold) {
      setShowScrollTop(true)
    } else {
      setShowScrollTop(false)
    }
  }
}

/**
 * 부드럽게 상단으로 스크롤
 */
export function scrollToTop(): void {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
