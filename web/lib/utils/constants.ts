/**
 * 공통 상수 정의
 */

// ==================== Categories ====================

export const CATEGORIES = ['전체', '한우', '한돈', '수입육', '닭·오리', '가공육', '양념육', '과일·야채', '선물세트'] as const

// 관리자용 (전체 제외) - 동적으로 생성
export const ADMIN_CATEGORIES = CATEGORIES.filter(cat => cat !== '전체') as readonly string[]

// ==================== Menu ====================

// 메인 메뉴 (첫 번째 줄)
export const MAIN_MENU_LINKS = [
  { name: '홈', href: '/' },
  { name: '베스트', href: '/best' },
  { name: '특가', href: '/sale' },
  { name: '한우대가No.9', href: '/no9' },
  { name: '리뷰이벤트', href: '/review-event' },
]

// 카테고리 메뉴 (두 번째 줄) - 동적으로 생성
// 주의: 이 상수는 동적 import가 필요한 경우를 위해 유지하지만,
// 실제 링크는 getCategoryPath() 함수를 사용하는 것을 권장합니다.
export const CATEGORY_LINKS = CATEGORIES.map(category => ({
  name: category,
  href: category === '전체' ? '/products' : `/category/${category === '한우' ? 'hanwoo' : category === '한돈' ? 'handon' : category === '수입육' ? 'imported' : category === '닭·오리' ? 'chicken' : category === '가공육' ? 'processed' : category === '양념육' ? 'seasoned' : category === '과일·야채' ? 'produce' : category === '선물세트' ? 'gift-set' : category}`
}))

// ==================== Order Status ====================

export const VALID_ORDER_STATUSES = [
  'pending', 
  'ORDER_RECEIVED',      // 주문완료
  'PREPARING',           // 상품준비중
  'IN_TRANSIT',          // 배송중
  'DELIVERED',           // 배송완료
  'cancelled',
  'payment_error',       // 결제 검증 실패
] as const
export const VALID_DELIVERY_TYPES = ['pickup', 'quick', 'regular'] as const

// ==================== Delivery ====================

// 배송비 및 무료배송 기준
export const SHIPPING = {
  FREE_THRESHOLD: 50000,    // 무료배송 기준 금액
  DEFAULT_FEE: 3000,        // 기본 배송비
  QUICK_FEE: 5000,          // 퀵배송 추가 요금
} as const

// 픽업 시간대 (오전 9시 ~ 오후 9시, 1시간 단위)
export const PICKUP_TIME_SLOTS = [
  '9:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
]

// 퀵배달 지역
export const QUICK_DELIVERY_AREAS = [
  '연향동', '조례동', '풍덕동', '해룡면'
]

// 퀵배달 시간대
export const QUICK_DELIVERY_TIME_SLOTS = [
  '오후 3시~5시'
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

