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
  shipping_name: string
  shipping_phone: string
  delivery_note?: string
  delivery_time?: string
  created_at: string
  order_items?: OrderItem[]
  user?: User
  immediateDiscount?: number
  couponDiscount?: number
  usedPoints?: number
  shipping?: number
  refund_completed_at?: string | null
  tracking_number?: string | null
  is_gift?: boolean
  payment_method?: string | null
}

export type OrderStatus = 'all' | 'pending' | 'ORDER_RECEIVED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'cancelled'
export type DeliveryType = 'all' | 'pickup' | 'quick' | 'regular'

export interface OrderFilters {
  deliveryType: DeliveryType
  date: string
  startDate: string | null
  endDate: string | null
  status: OrderStatus | 'all'
}

