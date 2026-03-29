export interface Banner {
  id: string
  title?: string | null
  subtitle_black?: string | null
  subtitle_red?: string | null
  description?: string | null
  image_url: string
  background_color: string
  is_active: boolean
  sort_order: number
  slug?: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  price: number
  brand: string | null
  category: string
}

