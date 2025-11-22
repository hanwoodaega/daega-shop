/**
 * 공통 상수 정의
 */

// ==================== Categories ====================

export const CATEGORIES = ['전체', '한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채', '선물세트'] as const

// 관리자용 (전체 제외) - 동적으로 생성
export const ADMIN_CATEGORIES = CATEGORIES.filter(cat => cat !== '전체') as readonly string[]

// ==================== Menu ====================

// 메인 메뉴 (첫 번째 줄)
export const MAIN_MENU_LINKS = [
  { name: '홈', href: '/' },
  { name: '베스트', href: '/collections/best' },
  { name: '특가', href: '/collections/sale' },
  { name: '한우대가 NO.9', href: '/hanwoo-daega-no9' },
  { name: '리뷰이벤트', href: '/review-event' },
]

// 카테고리 메뉴 (두 번째 줄) - 동적으로 생성
export const CATEGORY_LINKS = CATEGORIES.map(category => ({
  name: category,
  href: category === '전체' ? '/products' : `/products?category=${encodeURIComponent(category)}`
}))

// ==================== Order Status ====================

export const VALID_ORDER_STATUSES = [
  'pending', 
  'ORDER_RECEIVED',      // 주문완료
  'PREPARING',           // 상품준비중
  'IN_TRANSIT',          // 배송중
  'DELIVERED',           // 배송완료
  'cancelled'
] as const
export const VALID_DELIVERY_TYPES = ['pickup', 'quick', 'regular'] as const

// ==================== Delivery ====================

// 배송비 및 무료배송 기준
export const SHIPPING = {
  FREE_THRESHOLD: 50000,    // 무료배송 기준 금액
  DEFAULT_FEE: 3000,        // 기본 배송비
  QUICK_FEE: 5000,          // 퀵배송 추가 요금
} as const

// 픽업 시간대 (오전 10시 ~ 오후 8시, 1시간 단위)
export const PICKUP_TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

// 퀵배달 지역
export const QUICK_DELIVERY_AREAS = [
  '광진구', '성동구', '중랑구', '동대문구',
  '강남구', '서초구', '송파구', '강동구'
]

// 퀵배달 시간대
export const QUICK_DELIVERY_TIME_SLOTS = [
  '1시간 이내', '2시간 이내', '오전 배송', '오후 배송', '저녁 배송'
]

// ==================== Pagination ====================

export const DEFAULT_PAGE_SIZE = 20
// 관리자 페이지도 같은 페이지 크기 사용
export const ADMIN_PAGE_SIZE = DEFAULT_PAGE_SIZE

// ==================== Promotion ====================

export const PROMOTION_TYPES = ['1+1', '2+1', '3+1'] as const
export type PromotionType = typeof PROMOTION_TYPES[number]

// ==================== Gift ====================

// 선물하기 최소 금액
export const GIFT_MIN_AMOUNT = 50000

