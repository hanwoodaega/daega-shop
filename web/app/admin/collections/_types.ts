export interface ColorTheme {
  background?: string
  accent?: string
  title_color?: string
}

export interface Collection {
  id: string
  type: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  color_theme?: ColorTheme | null
  sort_order?: number
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CollectionProduct {
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

