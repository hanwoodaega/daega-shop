export interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product?: {
    name: string
    image_url: string
    price?: number
  }
}

export interface User {
  name: string
  email: string
  phone: string
}

export interface Order {
  id: string
  order_number?: string | null
  user_id: string
  total_amount: number
  status: string
  delivery_type: string
  shipping_address: string
  orderer_name?: string | null
  orderer_phone?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  delivery_note?: string
  delivery_time?: string
  created_at: string
  order_items?: OrderItem[]
  user?: User
  immediateDiscount?: number
  couponDiscount?: number
  usedPoints?: number
  /** 스냅샷: 주문 당시 사용 포인트 (있으면 이 값을 우선 사용) */
  points_used?: number
  /** 스냅샷: 주문 당시 쿠폰 할인 금액 (있으면 이 값을 우선 사용) */
  coupon_discount_amount?: number
  shipping?: number
  refund_completed_at?: string | null
  tracking_number?: string | null
  tracking_company?: string | null
  toss_payment_key?: string | null
}

export type OrderStatus = 'all' | 'pending' | 'ORDER_RECEIVED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'cancelled' | 'payment_error'
export type DeliveryType = 'all' | 'pickup' | 'regular'

export interface OrderFilters {
  deliveryType: DeliveryType
  date: string
  startDate: string | null
  endDate: string | null
  status: OrderStatus | 'all'
  orderNumber: string
}

