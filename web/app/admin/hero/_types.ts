export interface HeroSlide {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HeroFormData {
  image_url: string
  link_url: string
  sort_order: number
  is_active: boolean
}

