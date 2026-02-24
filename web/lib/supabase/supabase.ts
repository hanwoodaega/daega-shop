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

export interface Promotion {
  id: string
  type: 'bogo' | 'percent'
  buy_qty?: number | null
  discount_percent?: number | null
  is_active: boolean
}

export interface Product {
  id: string
  slug?: string | null
  brand?: string | null
  name: string
  price: number
  image_url: string | null  // product_images에서 가져온 이미지 (우선순위가 가장 높은 것)
  category: string
  average_rating?: number | null  // 평균 별점
  review_count?: number | null  // 리뷰 개수
  promotion?: Promotion | null  // 활성 프로모션 정보
  weight_gram?: number | null  // 상품 무게 (그램 단위, 선택사항)
  status?: 'active' | 'soldout' | 'deleted' | null  // 상품 상태
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
  status: 'pending' | 'ORDER_RECEIVED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'cancelled'
  delivery_type: 'pickup' | 'quick' | 'regular'
  delivery_time?: string | null
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note?: string | null
  tracking_number?: string | null  // 송장번호
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
  valid_from?: string | null  // 레거시 컬럼 (사용 안 함, validity_days로 대체됨)
  valid_until?: string | null  // 레거시 컬럼 (사용 안 함, validity_days로 대체됨)
  is_active: boolean
  issue_trigger: 'PHONE_VERIFIED' | 'ADMIN' | 'ETC'
  is_deleted: boolean  // 삭제 여부 (soft delete)
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
  expires_at?: string | null  // 만료일 (서버에서 계산하여 저장)
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

