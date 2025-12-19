export interface Promotion {
  id: string
  title: string
  type: 'bogo' | 'percent'
  buy_qty: number | null
  discount_percent: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PromotionProduct {
  id: string
  product_id: string
  group_id: string | null
  priority: number
  products: {
    id: string
    name: string
    price: number
    image_url: string
    brand: string | null
  }
}

export interface Product {
  id: string
  name: string
  price: number
  image_url: string
  brand: string | null
  category: string
}

export interface PromotionFormData {
  title: string
  type: 'bogo' | 'percent'
  buy_qty: number
  discount_percent: number
  is_active: boolean
  group_id: string
}

