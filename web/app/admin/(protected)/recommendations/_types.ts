export interface RecommendationCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecommendationProduct {
  id: string
  product_id: string
  sort_order: number
  products: {
    id: string
    name: string
    price: number
    brand: string | null
    category: string
  }
}

export interface Product {
  id: string
  name: string
  price: number
  brand: string | null
  category: string
}

export interface RecommendationFormData {
  name: string
  sort_order: number
  is_active: boolean
}

export interface SelectedProduct {
  product_id: string
  sort_order: number
}

