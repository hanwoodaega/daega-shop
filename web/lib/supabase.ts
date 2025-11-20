import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Supabase 클라이언트 생성 (cookie 기반으로 변경)
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl as string, supabaseAnonKey as string)
  : (null as unknown as ReturnType<typeof createBrowserClient>)

/**
 * Database Types
 * These types represent the database schema structure
 */

export interface Product {
  id: string
  slug?: string | null
  brand?: string | null
  name: string
  price: number
  image_url: string
  category: string
  stock: number
  discount_percent?: number | null
  is_best?: boolean
  is_sale?: boolean
  promotion_type?: '1+1' | '2+1' | '3+1' | null
  promotion_products?: string[] | null  // 증정 가능한 상품 ID 배열
  average_rating?: number | null  // 평균 별점
  review_count?: number | null  // 리뷰 개수
  flash_sale_start_time?: string | null  // 타임딜 시작 시간 (선택)
  flash_sale_end_time?: string | null    // 타임딜 종료 시간
  flash_sale_price?: number | null       // 타임딜 가격
  flash_sale_stock?: number | null       // 타임딜 한정 수량
  gift_target?: string[] | null           // 선물 대상 (아이, 부모님, 연인, 친구)
  gift_display_order?: number | null      // 선물관 표시 순서
  gift_budget_targets?: string[] | null    // 예산 카테고리 (under-50k, over-50k, over-100k, over-200k)
  gift_budget_order?: number | null        // 예산별 표시 순서
  gift_featured?: boolean | null           // 실시간 인기 선물세트 여부
  gift_featured_order?: number | null     // 실시간 인기 선물세트 우선순위
  created_at: string
  updated_at: string
}

/**
 * Database CartItem type (for server-side operations)
 * Note: Client-side cart uses a different CartItem interface in @/lib/store
 */
export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product?: Product
}

/**
 * Order type for database operations
 */
export interface Order {
  id: string
  order_number?: string | null  // 고객용 주문번호 (YYYYMMDD-####)
  user_id: string
  total_amount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  delivery_type: 'pickup' | 'quick' | 'regular'
  delivery_time?: string | null
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note?: string | null
  refund_status?: 'pending' | 'processing' | 'completed' | null
  refund_amount?: number | null
  refund_requested_at?: string | null
  refund_completed_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * OrderItem type for database operations
 */
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  product?: Product
}

/**
 * User Points type for database operations
 */
export interface UserPoints {
  id: string
  user_id: string
  total_points: number
  purchase_count: number
  created_at: string
  updated_at: string
}

/**
 * Point History type for database operations
 */
export interface PointHistory {
  id: string
  user_id: string
  points: number  // 양수: 적립, 음수: 사용
  type: 'purchase' | 'review' | 'referral' | 'usage' | 'expired'
  description: string
  order_id?: string | null
  review_id?: string | null
  created_at: string
}

/**
 * Coupon type for database operations
 */
export interface Coupon {
  id: string
  name: string
  description?: string | null
  discount_type: 'percentage' | 'fixed'  // percentage: 할인율, fixed: 고정 금액
  discount_value: number  // 할인율(%) 또는 할인 금액(원)
  min_purchase_amount?: number | null  // 최소 구매 금액
  max_discount_amount?: number | null  // 최대 할인 금액 (percentage일 때만)
  validity_days: number  // 유효 기간 (일수) - 발급일부터 해당 일수만큼 유효
  valid_from: string  // 호환성을 위해 유지 (사용 안 함)
  valid_until: string  // 호환성을 위해 유지 (사용 안 함)
  is_active: boolean
  usage_limit?: number | null  // 전체 사용 가능 횟수 (null이면 무제한)
  usage_count: number  // 현재 사용 횟수
  is_first_purchase_only: boolean  // 첫구매 전용 여부
  created_at: string
  updated_at: string
}

/**
 * User Coupon type for database operations
 */
export interface UserCoupon {
  id: string
  user_id: string
  coupon_id: string
  is_used: boolean
  used_at?: string | null
  order_id?: string | null
  created_at: string
  coupon?: Coupon
}

/**
 * Address type for database operations
 */
export interface Address {
  id: string
  user_id: string
  name: string
  recipient_name: string
  recipient_phone: string
  zipcode?: string
  address: string
  address_detail?: string
  delivery_note?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

