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
    image_url: string
  }
}

export interface OrderWithItems {
  id: string
  order_number?: string | null
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

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
export type DeliveryType = 'pickup' | 'quick' | 'regular'
export type RefundStatus = 'pending' | 'processing' | 'completed'

export const VALID_ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
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

