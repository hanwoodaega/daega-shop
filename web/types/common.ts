/**
 * 공통 타입 정의
 * 프로젝트 전체에서 사용되는 공통 타입들
 */

// ==================== Order Types ====================

export interface OrderItem {
  id: string
  order_id?: string
  product_id: string
  quantity: number
  price: number
  created_at?: string
  product?: {
    name: string
    image_url: string | null
  }
}

export interface OrderWithItems {
  id: string
  order_number?: string | null
  user_id: string
  total_amount: number
  status: OrderStatus
  delivery_type: 'pickup' | 'quick' | 'regular'
  delivery_time?: string | null
  shipping_address: string
  shipping_name: string
  shipping_phone: string
  delivery_note?: string | null
  tracking_number?: string | null  // 송장번호
  refund_completed_at?: string | null
  created_at: string
  updated_at?: string
  order_items?: OrderItem[]
  user?: {
    name: string
    email: string
    phone: string
  }
}

// ==================== User Types ====================

export interface UserProfile {
  id?: string
  name: string
  email: string
  phone: string
}

// ==================== Address Types ====================

export interface Address {
  id: string
  user_id: string
  name: string
  recipient_name: string
  recipient_phone: string
  zipcode?: string | null
  address: string
  address_detail?: string | null
  delivery_note?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

// ==================== Status & Delivery ====================

export type OrderStatus = 
  | 'pending' 
  | 'ORDER_RECEIVED'      // 주문완료 (고객이 결제하면 자동 설정)
  | 'PREPARING'           // 상품준비중 (관리자가 수동으로 변경)
  | 'IN_TRANSIT'          // 배송중 (관리자가 송장번호 입력 시 자동 변경)
  | 'DELIVERED'           // 배송완료 (관리자가 수동으로 변경)
  | 'cancelled'
  | 'payment_error'      // 결제 검증 실패 (금액 불일치 등)
export type DeliveryType = 'pickup' | 'quick' | 'regular'
export type RefundStatus = 'pending' | 'processing' | 'completed'

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'pending', 
  'ORDER_RECEIVED',      // 주문완료
  'PREPARING',           // 상품준비중
  'IN_TRANSIT',          // 배송중
  'DELIVERED',           // 배송완료
  'cancelled',
  'payment_error'
]
export const VALID_DELIVERY_TYPES: DeliveryType[] = ['pickup', 'quick', 'regular']
export const VALID_REFUND_STATUSES: RefundStatus[] = ['pending', 'processing', 'completed']

// ==================== Form Types ====================

export interface CheckoutFormData {
  name: string
  phone: string
  email: string
  address: string
  addressDetail: string
  zipcode: string
  message: string
}

export interface DeliveryState {
  method: DeliveryType
  pickupTime: string
  quickDeliveryArea: string
  quickDeliveryTime: string
}


