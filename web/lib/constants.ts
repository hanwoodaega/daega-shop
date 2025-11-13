/**
 * 공통 상수 정의
 */

// ==================== Categories ====================

export const CATEGORIES = ['전체', '한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

// 관리자용 (전체 제외)
export const ADMIN_CATEGORIES = ['한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

// ==================== Menu ====================

// 메인 메뉴 (첫 번째 줄)
export const MAIN_MENU_LINKS = [
  { name: '홈', href: '/' },
  { name: '신상품', href: '/products?filter=new' },
  { name: '베스트', href: '/products?filter=best' },
  { name: '전단행사', href: '/products?filter=sale' },
  { name: '알뜰상품', href: '/products?filter=budget' },
]

// 카테고리 메뉴 (두 번째 줄)
export const CATEGORY_LINKS = [
  { name: '전체', href: '/products' },
  { name: '한우', href: '/products?category=한우' },
  { name: '돼지고기', href: '/products?category=돼지고기' },
  { name: '수입육', href: '/products?category=수입육' },
  { name: '닭', href: '/products?category=닭' },
  { name: '가공육', href: '/products?category=가공육' },
  { name: '조리육', href: '/products?category=조리육' },
  { name: '야채', href: '/products?category=야채' },
]

// ==================== Order Status ====================

export const VALID_ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const
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
export const ADMIN_PAGE_SIZE = 20

// ==================== Promotion ====================

export const PROMOTION_TYPES = ['1+1', '2+1', '3+1'] as const
export type PromotionType = typeof PROMOTION_TYPES[number]

