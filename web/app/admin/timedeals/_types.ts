export interface TimeDeal {
  id: number
  title: string
  description?: string | null
  start_at: string
  end_at: string
  created_at: string
  updated_at: string
  products?: TimeDealProduct[]
}

export interface TimeDealProduct {
  id: number
  product_id: string
  discount_percent: number
  sort_order: number
  products?: {
    id: string
    name: string
    price: number
    image_url: string
    brand: string | null
    category: string
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

export interface TimeDealFormData {
  title: string
  description: string
  start_at: string
  end_at: string
}

export interface SelectedProductData {
  discount_percent: number
  sort_order: number
}

