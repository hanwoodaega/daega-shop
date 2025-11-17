// 리뷰 관련 타입 정의

export interface Review {
  id: string
  rating: number
  title?: string
  content: string
  images: string[]
  user_name: string
  user_id: string
  is_verified_purchase: boolean
  created_at: string
  updated_at?: string
  admin_reply?: string | null
  admin_replied_at?: string | null
}

export interface ReviewableProduct {
  order_item_id: string
  order_id: string
  order_number: string
  order_date: string
  product_id: string
  product_name: string
  product_image: string
  product_brand: string
  quantity: number
  price: number
}

export interface MyReview {
  id: string
  product_id: string
  order_id: string
  rating: number
  title?: string
  content: string
  images: string[]
  created_at: string
  product: {
    name: string
    image_url: string
    brand: string
  }
}

export interface ReviewListProps {
  productId: string
  onWriteReview: () => void
  limit?: number
  showViewAllButton?: boolean
}

export interface ReviewItemProps {
  review: Review
  isOwner?: boolean
  onEdit?: (review: Review) => void
  onDelete?: (reviewId: string) => void
}

export interface ReviewWriteModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  orderId: string
  productName: string
  productImage?: string
  onSuccess: () => void
  editMode?: boolean
  reviewId?: string
  initialRating?: number
  initialTitle?: string
  initialContent?: string
  initialImages?: string[]
}

