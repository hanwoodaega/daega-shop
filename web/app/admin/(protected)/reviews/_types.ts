export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AdminReview {
  id: string
  product_id: string
  order_id: string
  user_id: string
  rating: number
  title?: string | null
  content: string
  images: string[]
  status?: ReviewStatus
  created_at: string
  user_name?: string
  product?: {
    name: string
    image_url: string
    brand?: string
  } | null
  admin_reply?: string | null
  admin_replied_at?: string | null
}

export interface ReviewListResponse {
  reviews: AdminReview[]
  total: number
  page: number
  totalPages: number
}

export interface ReviewFilters {
  date: string // YYYY-MM-DD 형식, 빈 문자열이면 전체
}

