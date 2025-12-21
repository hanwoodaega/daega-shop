export interface Category {
  id: string
  type: string
  title: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryProduct {
  id: string
  product_id: string
  priority: number | null
  products: {
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

